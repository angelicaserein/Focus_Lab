// 伙伴 / 祈愿系统的数据层（纯数据，与 React 无关，便于复用与单测）。
//
// 设计取向：借二游的「皮」，避开二游的「钩子」——
//   借鉴：常驻伙伴立绘、祈愿揭晓的仪式感、图鉴收集的探索欲；
//   避开：体力/树脂上限、每日签到连续、限定池 FOMO、氪金与数值 power creep。
// 因此这里的祈愿是「无损」的：每次都从「还没遇见的」里抽，抽到的必是新东西（纯进度、
// 无重复挫败）；全部遇见后再抽只回一点「星尘」（返币），永远不空军、也不制造稀缺焦虑。
// 稀有度只影响揭晓时的光效与惊喜，不代表强弱、不评判用户。

// ── 伙伴：研究所的灯灵「灯灯 / Lumi」──────────────────────
// 一盏会飘的暖灯，长夜里陪你专注。永远鼓励、从不评判——契合 ADHD 友好原则。
export const COMPANION_MOODS = ["idle", "focus", "cheer", "sleepy"];

// 每种心情的台词条数（组件按 companion.line.<mood>.<i> 取 i18n，随机选一句）。
export const LINES_PER_MOOD = 3;

// 取某心情下的一句随机台词（缺省回退到 idle）。
export function companionLine(t, mood = "idle", rng = Math.random) {
  const m = COMPANION_MOODS.includes(mood) ? mood : "idle";
  const i = Math.floor(rng() * LINES_PER_MOOD);
  return t(`companion.line.${m}.${i}`);
}

// ── 立绘皮肤（outfit）：可佩戴，改变灯灵的色调与头顶饰物 ──────
// hue 决定身体渐变主色；badge 是头顶的小饰物 emoji（与全 app 的 emoji 风格一致）。
export const DEFAULT_LOOK = { hue: 43, badge: null }; // 暖金，无饰物

// 单一事实源：一件立绘皮肤同时是「可佩戴的视觉」和「祈愿池里的一件物品」，
// 两处（lookForOutfit 的色调饰物 / WISH_POOL 的抽取项）都从这里派生，增删只改这一处。
// 头顶饰物 badge 同时充当祈愿池里的 icon（同一枚 emoji），避免重复维护。
const OUTFITS = [
  { id: "outfit_leaf",  rarity: "common", hue: 138, badge: "🍃" },
  { id: "outfit_moon",  rarity: "rare",   hue: 214, badge: "🌙" },
  { id: "outfit_star",  rarity: "rare",   hue: 265, badge: "⭐" },
  { id: "outfit_ember", rarity: "epic",   hue: 18,  badge: "🔥" },
  { id: "outfit_bloom", rarity: "epic",   hue: 330, badge: "🌸" },
];

const OUTFIT_LOOK = Object.fromEntries(
  OUTFITS.map(({ id, hue, badge }) => [id, { hue, badge }]),
);

// 佩戴的 outfit id → 立绘视觉参数（未佩戴 / 未知则回退默认暖金）。
export function lookForOutfit(outfitId) {
  return OUTFIT_LOOK[outfitId] ?? DEFAULT_LOOK;
}

// —— 世界观回忆卡（收集向，不可佩戴）——
const LORE = [
  { id: "lore_lab",   rarity: "common", icon: "🔭" },
  { id: "lore_lumi",  rarity: "common", icon: "🪔" },
  { id: "lore_river", rarity: "rare",   icon: "🌊" },
  { id: "lore_night", rarity: "epic",   icon: "🌌" },
];

// ── 图鉴 / 祈愿池 ────────────────────────────────────────
// kind: "outfit"（可佩戴立绘皮肤）| "lore"（世界观回忆卡，收集向）
// rarity: "common" | "rare" | "epic"（仅影响揭晓光效与抽取权重，不代表强弱）
export const WISH_POOL = [
  ...OUTFITS.map(({ id, rarity, badge }) => ({ id, kind: "outfit", rarity, icon: badge })),
  ...LORE.map(({ id, rarity, icon }) => ({ id, kind: "lore", rarity, icon })),
];

const ITEM_BY_ID = Object.fromEntries(WISH_POOL.map((it) => [it.id, it]));
export function itemById(id) {
  return ITEM_BY_ID[id];
}

// 抽取权重：越稀有越少见（但因为只从「未遇见」池里抽，稀有的也终会遇到）。
const RARITY_WEIGHT = { common: 6, rare: 3, epic: 1 };
export function rarityWeight(rarity) {
  return RARITY_WEIGHT[rarity] ?? 1;
}

// 单次祈愿花费的金币（1 秒专注 = 1 金币，约 2 分钟专注可换一次）。
export const WISH_COST = 120;
// 全部遇见后再祈愿，回赠的「星尘」（返还金币），永不空军。
export const ALL_MET_REFUND = 40;

// 无损祈愿抽取：
//   还有没遇见的 → 从未遇见池里按稀有度加权抽一件（保证是新的，纯进度、无重复挫败）；
//   全部遇见 → 返一点星尘。rng 可注入以便单测。
// 返回 { itemId } 或 { stardust }。
export function drawWish(collectionIds, rng = Math.random) {
  const owned = new Set(collectionIds || []);
  const pool = WISH_POOL.filter((it) => !owned.has(it.id));
  if (pool.length === 0) return { stardust: ALL_MET_REFUND };

  const total = pool.reduce((s, it) => s + rarityWeight(it.rarity), 0);
  let roll = rng() * total;
  for (const it of pool) {
    roll -= rarityWeight(it.rarity);
    if (roll < 0) return { itemId: it.id };
  }
  return { itemId: pool[pool.length - 1].id }; // 浮点兜底
}
