// 生态缸数据层：物种目录 + 金币换鱼的「无损抽取」逻辑。纯数据、与 React 无关，便于复用与单测。
//
// 收集观沿用祈愿（见 pages/Wish）——花金币必出一件「还没入住」的新物种，纯进度、无重复挫败，
// 契合 ADHD 友好原则。全部入住后停止售卖（缸已圆满），不做「花币只回一点」的净亏。
//
// 每个物种的 glyph 决定它在缸里与图鉴里的形状（同一份造型，见 data/aquarium/creatureShapes）；
// 名字/描述走 i18n（aquarium.species.<id>.name / .desc），稀有度文案走 aquarium.rarity.<r>。

// 一条鱼的价格（金币）。调这里即可整体调节节奏。
export const FISH_COST = 25;

// 物种目录。id 同时用作 glyph 形状键。
//   rarity: 1 常见 / 2 稀有 / 3 史诗
//   hue:    物种之间的相对色差刻度。不是最终色相偏移——creaturePalette.speciesShift 会把它
//           压进主色附近的邻近色带，余量转成明度差（否则 ±190 那几只会转到主色补色去、
//           整缸脱离主题）。这里只需保证各物种数值互不相同、拉开距离即可。
//   motion: 在缸里的行为。swim 游动 / drift 悬浮飘（水母）/ crawl 贴底爬 / anchor 扎根摇曳
export const FISH_SPECIES = [
  // —— 常见 ——
  { id: "fish",     glyph: "fish",     rarity: 1, hue: 0,    motion: "swim" },
  { id: "guppy",    glyph: "guppy",    rarity: 1, hue: 28,   motion: "swim" },
  { id: "shell",    glyph: "shell",    rarity: 1, hue: -22,  motion: "crawl" },
  { id: "crab",     glyph: "crab",     rarity: 1, hue: -45,  motion: "crawl" },
  { id: "shrimp",   glyph: "shrimp",   rarity: 1, hue: -34,  motion: "swim" },
  { id: "snail",    glyph: "snail",    rarity: 1, hue: 18,   motion: "crawl" },
  { id: "seaweed",  glyph: "seaweed",  rarity: 1, hue: 96,   motion: "anchor" },
  { id: "star",     glyph: "star",     rarity: 1, hue: -60,  motion: "crawl" },
  // —— 稀有 ——
  { id: "clown",    glyph: "clown",    rarity: 2, hue: -40,  motion: "swim" },
  { id: "tang",     glyph: "tang",     rarity: 2, hue: 150,  motion: "swim" },
  { id: "jelly",    glyph: "jelly",    rarity: 2, hue: 62,   motion: "drift" },
  { id: "coral",    glyph: "coral",    rarity: 2, hue: -18,  motion: "anchor" },
  { id: "anemone",  glyph: "anemone",  rarity: 2, hue: -70,  motion: "anchor" },
  { id: "puffer",   glyph: "puffer",   rarity: 2, hue: 40,   motion: "swim" },
  { id: "angel",    glyph: "angel",    rarity: 2, hue: 130,  motion: "swim" },
  { id: "seahorse", glyph: "seahorse", rarity: 2, hue: 78,   motion: "drift" },
  // —— 史诗 ——
  { id: "koi",      glyph: "koi",      rarity: 3, hue: -30,  motion: "swim" },
  { id: "turtle",   glyph: "turtle",   rarity: 3, hue: 110,  motion: "swim" },
  { id: "octopus",  glyph: "octopus",  rarity: 3, hue: -85,  motion: "crawl" },
  { id: "ray",      glyph: "ray",      rarity: 3, hue: 170,  motion: "swim" },
  { id: "axolotl",  glyph: "axolotl",  rarity: 3, hue: -55,  motion: "swim" },
  { id: "whale",    glyph: "whale",    rarity: 3, hue: 190,  motion: "swim" },
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
