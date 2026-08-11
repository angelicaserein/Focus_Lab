// 烧瓶架数据层：纯数据，与 React 无关，便于单测。
//
// 一只烧瓶＝一份存下来的形状 + 它累计接到的专注时长。注满一只要 1 小时；
// 超出的部分不丢，自动流进下一只同样形状的烧瓶——所以架上的一格其实是
// 「同一形状的一排瓶子」：前面几只满的，末尾一只正在接。
//
// 注满进度不单独存档，而是从专注记录现算：每条记录带 flaskId（结算时写入），
// 按会话去重后归到各自的烧瓶名下。好处是永远和历史记录对得上，
// 不会出现「删了记录但瓶子还满着」这种两份账不一致的情况。
import { sessionKey } from "@/utils/records/focusRecords";
import { FLASK_PRESETS, DEFAULT_FLASK_PRESET } from "@/pages/Focus/flaskShapes";

export const FLASK_FULL_SECS = 3600; // 一只烧瓶注满 = 1 小时专注
// 架子不设容量上限：想存多少只存多少只。瓶子多了靠排序找（见 sortShelf），
// 而不是靠拦着不让存。

// 存一只烧瓶：把当下的参数拷贝一份定格下来（之后在设置页继续调形状，
// 不会改到已经存下来的这只——存的是「那一刻的它」）。
export function makeShelfFlask({ name, preset, params }) {
  return {
    id: crypto.randomUUID(),
    name: name || "",
    preset: FLASK_PRESETS[preset] ? preset : DEFAULT_FLASK_PRESET,
    params: { ...params },
    savedAt: Date.now(),
  };
}

// 归一化持久化值，容忍缺字段 / 手改坏的存档。
// activeId 永远指向架上真实存在的一只（否则退到第一只；空架子为 null）。
export function normalizeShelf(value) {
  const raw = Array.isArray(value?.items) ? value.items : [];
  const items = raw
    .filter((it) => it && typeof it.id === "string" && it.params)
    .map((it) => ({
      id: it.id,
      name: typeof it.name === "string" ? it.name : "",
      preset: FLASK_PRESETS[it.preset] ? it.preset : DEFAULT_FLASK_PRESET,
      params: { ...it.params },
      savedAt: typeof it.savedAt === "number" ? it.savedAt : 0,
    }));
  const activeId = items.some((it) => it.id === value?.activeId)
    ? value.activeId
    : items[0]?.id ?? null;
  return { items, activeId };
}

// 各烧瓶的账：{ [flaskId]: { secs, sessions, lastAt } }。
// secs＝累计接到的秒数，sessions＝往里注过几次专注，lastAt＝最近一次的时间戳。
//
// 一次会话里每个任务各写一条记录、durationSecs 是会话到那一刻的累计值，
// 所以按会话取 max 而非求和（与 sessionMaxSecsMap 同一口径），
// 否则一次三任务的专注会被算成三倍——次数同理，一次会话只算一次。
export function shelfStats(records) {
  // sessionKey → { flaskId, secs, at }
  const bySession = new Map();
  for (const r of records) {
    if (!r?.flaskId) continue; // 没有归属的（旧记录 / 架子空着时的专注）不入账
    const key = sessionKey(r);
    const at = r.endedAt || r.startedAt || 0;
    const cur = bySession.get(key);
    if (!cur) {
      bySession.set(key, { flaskId: r.flaskId, secs: r.durationSecs || 0, at });
    } else {
      // 一次会话中途换瓶的情况：认最先记下的那只，整段时长不拆分
      cur.secs = Math.max(cur.secs, r.durationSecs || 0);
      cur.at = Math.max(cur.at, at);
    }
  }
  const stats = {};
  for (const { flaskId, secs, at } of bySession.values()) {
    const cur = stats[flaskId] ?? (stats[flaskId] = { secs: 0, sessions: 0, lastAt: 0 });
    cur.secs += secs;
    cur.sessions += 1;
    cur.lastAt = Math.max(cur.lastAt, at);
  }
  return stats;
}

// 账 → 只要水位的那一层：{ [flaskId]: secs }（调试覆盖表也按这个形状合并）
export function fillsOf(stats) {
  const totals = {};
  for (const [id, s] of Object.entries(stats)) totals[id] = s.secs;
  return totals;
}

// 记录 → 各烧瓶累计接到的秒数。页面已经算过 stats 的话直接用 fillsOf，别算两遍。
export function shelfFillSecs(records) {
  return fillsOf(shelfStats(records));
}

// —— 架子排序 ——
// 架子不设上限，瓶子攒多了就得能挑着看。默认仍是「存入顺序」：
// 位置不动，眼睛记得住哪只在哪儿；换成别的排法是当下想找东西时的临时视角。
export const SHELF_SORTS = ["saved", "fullest", "recent", "name"];
export const DEFAULT_SHELF_SORT = "saved";

export function normalizeSort(value) {
  return SHELF_SORTS.includes(value) ? value : DEFAULT_SHELF_SORT;
}

// 排出一份新数组（不改入参）。同分的一律退回存入顺序，
// 免得每次进页面顺序都不一样——一模一样的两只瓶子应该待在一模一样的位置。
export function sortShelf(items, stats, mode) {
  const idx = new Map(items.map((it, i) => [it.id, i]));
  const stat = (id) => stats?.[id] ?? { secs: 0, sessions: 0, lastAt: 0 };
  const bySaved = (a, b) => idx.get(a.id) - idx.get(b.id);

  const sorted = [...items];
  switch (normalizeSort(mode)) {
    case "fullest": // 注得最多的在前
      sorted.sort((a, b) => stat(b.id).secs - stat(a.id).secs || bySaved(a, b));
      break;
    case "recent": // 最近用过的在前；从没用过的沉底
      sorted.sort((a, b) => stat(b.id).lastAt - stat(a.id).lastAt || bySaved(a, b));
      break;
    case "name": // 按名字；没起名的（显示的是预设名）沉底，免得空名字占着开头
      sorted.sort(
        (a, b) =>
          Number(!a.name) - Number(!b.name) ||
          // numeric：「瓶 2」排在「瓶 10」前面，别按字符串比成 10 < 2
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) ||
          bySaved(a, b),
      );
      break;
    default: // saved：存入顺序，原样不动
      break;
  }
  return sorted;
}

// 累计秒数 → 这只烧瓶攒到哪儿了。
// full＝已注满几只（页面上一只一张卡）；partial＝正在接的那只到了几成（0~1）；
// total＝含正在接的那只在内一共几只。
export function bottlesOf(totalSecs) {
  const secs = Math.max(0, totalSecs || 0);
  const full = Math.floor(secs / FLASK_FULL_SECS);
  const partial = (secs % FLASK_FULL_SECS) / FLASK_FULL_SECS;
  const total = full + 1; // 末尾永远有一只正在接的空瓶
  return { full, partial, total, secs };
}
