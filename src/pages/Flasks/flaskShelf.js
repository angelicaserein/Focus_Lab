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
export const MAX_SHELF = 12; // 架子容量：再多就成了瓶子墙，找不着自己在专注哪只

// 一排最多画多少只瓶子，超出的用 "+N" 交代。攒到几十小时时不至于铺满整页。
export const MAX_BOTTLES_DRAWN = 12;

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

// 各烧瓶累计接到的秒数：{ [flaskId]: secs }。
// 一次会话里每个任务各写一条记录、durationSecs 是会话到那一刻的累计值，
// 所以按会话取 max 而非求和（与 sessionMaxSecsMap 同一口径），
// 否则一次三任务的专注会被算成三倍。
export function shelfFillSecs(records) {
  // sessionKey → { flaskId, secs }
  const bySession = new Map();
  for (const r of records) {
    if (!r?.flaskId) continue; // 没有归属的（旧记录 / 架子空着时的专注）不入账
    const key = sessionKey(r);
    const cur = bySession.get(key);
    if (!cur) {
      bySession.set(key, { flaskId: r.flaskId, secs: r.durationSecs || 0 });
    } else {
      // 一次会话中途换瓶的情况：认最先记下的那只，整段时长不拆分
      cur.secs = Math.max(cur.secs, r.durationSecs || 0);
    }
  }
  const totals = {};
  for (const { flaskId, secs } of bySession.values()) {
    totals[flaskId] = (totals[flaskId] ?? 0) + secs;
  }
  return totals;
}

// 累计秒数 → 这一排瓶子的样子。
// full＝已注满几只；partial＝正在接的那只到了几成（0~1）；
// drawn＝实际要画的瓶子数（含正在接的那只），hidden＝因超上限而省略的满瓶数。
export function bottlesOf(totalSecs) {
  const secs = Math.max(0, totalSecs || 0);
  const full = Math.floor(secs / FLASK_FULL_SECS);
  const partial = (secs % FLASK_FULL_SECS) / FLASK_FULL_SECS;
  const total = full + 1; // 末尾永远有一只正在接的空瓶
  const drawn = Math.min(total, MAX_BOTTLES_DRAWN);
  return { full, partial, total, drawn, hidden: total - drawn, secs };
}
