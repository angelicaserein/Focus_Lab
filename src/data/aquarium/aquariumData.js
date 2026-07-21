// 生态缸数据层：物种目录 + 金币换鱼的「无损抽取」逻辑。纯数据、与 React 无关，便于复用与单测。
//
// 收集观沿用祈愿（见 pages/Wish）——花金币必出一件「还没入住」的新物种，纯进度、无重复挫败，
// 契合 ADHD 友好原则。全部入住后停止售卖（缸已圆满），不做「花币只回一点」的净亏。
//
// 每个物种的 glyph 决定它在缸里（canvas 手绘）与图鉴（SVG）中的形状；名字/描述走 i18n
// （aquarium.species.<id>.name / .desc），稀有度文案走 aquarium.rarity.<r>。

// 一条鱼的价格（金币）。调这里即可整体调节节奏。
export const FISH_COST = 25;

// 物种目录。id 同时用作 glyph 形状键。rarity: 1 常见 / 2 稀有 / 3 史诗。
export const FISH_SPECIES = [
  { id: "fish",     glyph: "fish",     rarity: 1 },
  { id: "shell",    glyph: "shell",    rarity: 1 },
  { id: "crab",     glyph: "crab",     rarity: 1 },
  { id: "jelly",    glyph: "jelly",    rarity: 2 },
  { id: "star",     glyph: "star",     rarity: 2 },
  { id: "coral",    glyph: "coral",    rarity: 2 },
  { id: "turtle",   glyph: "turtle",   rarity: 3 },
  { id: "seahorse", glyph: "seahorse", rarity: 3 },
];

export const TOTAL_SPECIES = FISH_SPECIES.length;

export function speciesById(id) {
  return FISH_SPECIES.find((s) => s.id === id) ?? null;
}

// 稀有度越低越常见（权重越大），让史诗更难得。
const RARITY_WEIGHT = { 1: 3, 2: 2, 3: 1 };

// 从「还没入住」的物种里按稀有度加权抽一件；全部入住则返回 null。
// owned: 已拥有物种 id 数组。rng: 可注入的 0~1 随机源（便于测试），默认 Math.random。
export function drawFish(owned, rng = Math.random) {
  const ownedSet = new Set(owned);
  const pool = FISH_SPECIES.filter((s) => !ownedSet.has(s.id));
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, s) => sum + (RARITY_WEIGHT[s.rarity] ?? 1), 0);
  let r = rng() * total;
  for (const s of pool) {
    r -= RARITY_WEIGHT[s.rarity] ?? 1;
    if (r < 0) return s.id;
  }
  return pool[pool.length - 1].id; // 浮点兜底
}
