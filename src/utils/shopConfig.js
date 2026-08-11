// 商品目录（静态配置，无需持久化）。
//   type: "unlock"     — 买过即拥有，不可重复买（目前仅界面皮肤，购买后真正切换主题）。
//   type: "consumable" — 可反复兑换，记录次数（自我犒劳类，兑换后自行享用）。
//   accent            — 图标底盘的点缀色（克制使用，仅图标区域）。
//   tag               — 分类 id（内部用，不直接显示；显示文案见 SHOP_CATEGORIES.labelKey）。
//   名称与描述        — 不写在这里，按 id 查 i18n 的 reward.item.<id>.name / .desc。
export const SHOP_ITEMS = [
  // ── 界面皮肤 ──
  {
    id: "theme-pink",
    icon: "🌸",
    price: 30,
    type: "unlock",
    accent: "#e075a8",
    tag: "皮肤",
  },
  {
    id: "theme-night",
    icon: "🌙",
    price: 50,
    type: "unlock",
    accent: "#7c6cf0",
    tag: "皮肤",
  },
  {
    id: "theme-ocean",
    icon: "🌊",
    price: 40,
    type: "unlock",
    accent: "#4a90d9",
    tag: "皮肤",
  },
  {
    id: "theme-forest",
    icon: "🌿",
    price: 45,
    type: "unlock",
    accent: "#4a9d6e",
    tag: "皮肤",
  },
  {
    id: "theme-sunset",
    icon: "🌇",
    price: 55,
    type: "unlock",
    accent: "#e8874a",
    tag: "皮肤",
  },
  {
    id: "theme-lavender",
    icon: "🪻",
    price: 55,
    type: "unlock",
    accent: "#9d8ce4",
    tag: "皮肤",
  },
  {
    id: "theme-teal",
    icon: "🫧",
    price: 45,
    type: "unlock",
    accent: "#3fb3a8",
    tag: "皮肤",
  },
  {
    id: "theme-peach",
    icon: "🍑",
    price: 50,
    type: "unlock",
    accent: "#ef9a8a",
    tag: "皮肤",
  },

  // ── 吃喝犒劳 ──
  {
    id: "milk-tea",
    icon: "🧋",
    price: 15,
    type: "consumable",
    accent: "#c8965a",
    tag: "吃喝",
  },
  {
    id: "coffee",
    icon: "☕",
    price: 12,
    type: "consumable",
    accent: "#a9764f",
    tag: "吃喝",
  },
  {
    id: "dessert",
    icon: "🍰",
    price: 20,
    type: "consumable",
    accent: "#ef7fa8",
    tag: "吃喝",
  },
  {
    id: "big-meal",
    icon: "🍜",
    price: 45,
    type: "consumable",
    accent: "#e8894a",
    tag: "吃喝",
  },

  // ── 放松娱乐 ──
  {
    id: "game-time",
    icon: "🎮",
    price: 60,
    type: "consumable",
    accent: "#4f9df0",
    tag: "放松",
  },
  {
    id: "episode",
    icon: "📺",
    price: 40,
    type: "consumable",
    accent: "#5b8def",
    tag: "放松",
  },
  {
    id: "movie",
    icon: "🎬",
    price: 70,
    type: "consumable",
    accent: "#8b6cf0",
    tag: "放松",
  },
  {
    id: "outdoor",
    icon: "🌳",
    price: 10,
    type: "consumable",
    accent: "#4fae7a",
    tag: "放松",
  },

  // ── 宠爱自己 ──
  {
    id: "sleep-in",
    icon: "😴",
    price: 80,
    type: "consumable",
    accent: "#6d7fd0",
    tag: "宠爱",
  },
  {
    id: "bath",
    icon: "🛁",
    price: 25,
    type: "consumable",
    accent: "#4fb0c8",
    tag: "宠爱",
  },
  {
    id: "lazy-scroll",
    icon: "📱",
    price: 12,
    type: "consumable",
    accent: "#7a8aa0",
    tag: "宠爱",
  },
  {
    id: "shopping",
    icon: "🛍️",
    price: 100,
    type: "consumable",
    accent: "#e07595",
    tag: "宠爱",
  },
];

// 分类顺序（用于分组展示）。tag 与 SHOP_ITEMS 中一致。
export const SHOP_CATEGORIES = [
  { tag: "皮肤", labelKey: "reward.cat.theme",  icon: "🎨" },
  { tag: "吃喝", labelKey: "reward.cat.food",   icon: "🍰" },
  { tag: "放松", labelKey: "reward.cat.relax",  icon: "🎮" },
  { tag: "宠爱", labelKey: "reward.cat.pamper", icon: "💖" },
];

// 内置商品 id 集合：这些商品的名称/描述走 i18n（reward.item.<id>.*），
// 自定义商品是用户自己写的，原样显示不翻译。
const BUILTIN_IDS = new Set(SHOP_ITEMS.map((it) => it.id));

export function shopItemName(t, item) {
  return BUILTIN_IDS.has(item.id) ? t(`reward.item.${item.id}.name`) : item.name;
}

export function shopItemDesc(t, item) {
  return BUILTIN_IDS.has(item.id) ? t(`reward.item.${item.id}.desc`) : item.desc;
}
