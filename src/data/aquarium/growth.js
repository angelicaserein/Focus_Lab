// 生态缸的「养大」层：换回来的不是一只成体，而是一颗卵——先孵成幼体，再长成图鉴里的样子。
//
// 为什么按墙上时钟算，而不是按「页面开着的时长」：养这件事要在你不看它的时候也在走，
// 回来才会有「它长大了」这一下；也因此不需要常驻计时器（关掉再打开，算的是同一个差值）。
//
// 存档是「一只一条」而不是「一个物种一条」：{ uid, id, born }（born = 入缸时刻，ms）。
// 同一物种养第二只时，那是另一颗新卵、另一条成长线，两只各长各的——所以 uid 不能省，
// 否则「再请一只」既存不下来（刷新就没了），也没法和先来的那只分开算。
// 老存档是纯 id 字符串数组，迁移时 born 记 0 —— 早就住进来的那批直接算成体，
// 不会因为这次更新一夜退回卵。

export const STAGE = { EGG: 0, FRY: 1, ADULT: 2 };

// 两道门槛（ms，自入缸起算）。养成节奏只由这两个数决定。
// 卵留得短一点：等太久看不出变化，就只剩「等」了；成体则值得多养一会儿。
export const HATCH_MS = 15 * 60 * 1000;      // 卵 → 幼体
export const ADULT_MS = 2 * 60 * 60 * 1000;  // 幼体 → 成体

// 各阶段相对成体的大小。缸里（canvas）与图鉴（SVG）共用这一份，两边大小才对得上。
export const EGG_SCALE = 0.42;
export const FRY_SCALE = 0.52;

// 破膜在整条成长线上的位置（0~1）。成长条上那道刻度用它，条才读得出「卵在前面这一小段」。
export const HATCH_AT = HATCH_MS / ADULT_MS;

// born → 当下的成长状态。
//   stage  STAGE.*
//   scale  相对成体的大小；幼体期是连续变大的（不是一跳一跳的三档）
//   ratio  本阶段内的进度 0~1
//   grown  整条成长线上的进度 0~1（卵到成体），成长条用这个
//   remain 距离下一阶段还有多少 ms（成体为 0）
export function growthOf(born, now = Date.now()) {
  const age = Math.max(0, now - (Number(born) || 0)); // 存档时间在未来（改过系统时钟）也不至于倒着长
  if (age >= ADULT_MS) {
    return { stage: STAGE.ADULT, scale: 1, ratio: 1, grown: 1, remain: 0 };
  }
  if (age >= HATCH_MS) {
    const p = (age - HATCH_MS) / (ADULT_MS - HATCH_MS);
    return {
      stage: STAGE.FRY,
      scale: FRY_SCALE + (1 - FRY_SCALE) * p,
      ratio: p,
      grown: age / ADULT_MS,
      remain: ADULT_MS - age,
    };
  }
  return {
    stage: STAGE.EGG,
    scale: EGG_SCALE,
    ratio: age / HATCH_MS,
    grown: age / ADULT_MS,
    remain: HATCH_MS - age,
  };
}

// 新入缸的一只。uid 在这里一次性定死并写进存档，之后不再变。
export function newResident(id, born = Date.now()) {
  return { uid: `${id}#${born}#${Math.random().toString(36).slice(2, 8)}`, id, born };
}

// 存档 → { uid, id, born, sealedIn, sealedAt }[]。兼容老格式（纯 id 字符串）与脏数据。
// 缺 uid 的老条目按「物种#入缸时刻#位置」补一个确定值——不能用随机数，否则每次
// normalize 出来的 uid 都不一样，React 的 key 一变列表就整片重挂。
//
// sealedIn：这一只被做成标本封进了哪只烧瓶（见 data/specimen）。封起来的仍留在收集里——
// 图鉴照旧算它一份（收集是无损的），只是不再在缸里游。没封的是 null。
export function normalizeCollection(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e, i) => {
      const src = typeof e === "string" ? { id: e, born: 0 } : e;
      if (!src || typeof src.id !== "string") return null;
      const born = Number(src.born) || 0;
      const uid = typeof src.uid === "string" ? src.uid : `${src.id}#${born}#${i}`;
      return {
        uid,
        id: src.id,
        born,
        sealedIn: typeof src.sealedIn === "string" ? src.sealedIn : null,
        sealedAt: Number(src.sealedAt) || 0,
      };
    })
    .filter(Boolean);
}

// 已入住的物种（去重）。图鉴与「是否收集满」看的是物种，不是只数。
export const ownedSpecies = (list) =>
  new Set(normalizeCollection(list).map((e) => e.id));

// 吃到一粒饵，往前赶一点进度。
// 喂食本来只是「点着好玩」，有了这一下才成立：你喂的那只确实长得比没喂的快。
// 实现上不加「已吃多少」这类新状态，而是把 born 往前挪——成长仍只由 born 与当下时间决定，
// 一处口径，图鉴、缸里、生长卡自动一致。
export const FEED_BOOST_MS = 2 * 60 * 1000;

// 喂一口之后的 born。到顶就是「刚好成体」，不会被挪得更早——否则会攒出一笔看不见的余量。
// 缸里那份住客数据和存档各存各的 born，两边都用这一个函数算，才不会喂完就对不上。
export function feedBorn(born, now = Date.now(), boost = FEED_BOOST_MS) {
  return Math.max(now - ADULT_MS, born - boost);
}

// 喂 uid 这一只。已经长成的喂了也只是好吃，不改存档。
// 没有任何改变时原样返回入参，调用方据此跳过一次落盘。
export function feedResident(list, uid, now = Date.now(), boost = FEED_BOOST_MS) {
  const items = normalizeCollection(list);
  const floor = now - ADULT_MS;
  let changed = false;
  const next = items.map((e) => {
    if (e.uid !== uid || e.born <= floor) return e;
    changed = true;
    return { ...e, born: feedBorn(e.born, now, boost) };
  });
  return changed ? next : list;
}
