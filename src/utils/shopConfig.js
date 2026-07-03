// 商品目录（静态配置，无需持久化）。
//   type: "unlock"     — 买过即拥有，不可重复买。
//   type: "consumable" — 可反复兑换，记录次数。
//   accent            — 卡片主题色（用于渐变、图标底盘、光晕）。
//   tag               — 分类角标文案。
//   featured          — 是否为主推商品（占据更大的展示位）。
export const SHOP_ITEMS = [
  {
    id: "theme-pink",
    name: "粉色主题",
    icon: "🌸",
    price: 30,
    type: "unlock",
    desc: "解锁一套柔和的粉色界面皮肤，专注也要美美的",
    accent: "#e075a8",
    tag: "皮肤",
    featured: true,
  },
  {
    id: "theme-night",
    name: "暗夜皮肤",
    icon: "🌙",
    price: 50,
    type: "unlock",
    desc: "深色护眼的暗夜界面，夜猫子的专属",
    accent: "#7c6cf0",
    tag: "皮肤",
  },
  {
    id: "milk-tea",
    name: "奶茶券",
    icon: "🧋",
    price: 10,
    type: "consumable",
    desc: "奖励自己一杯奶茶",
    accent: "#c8965a",
    tag: "犒劳",
  },
  {
    id: "dessert",
    name: "甜点奖励",
    icon: "🍰",
    price: 20,
    type: "consumable",
    desc: "来块蛋糕犒劳一下",
    accent: "#ef7fa8",
    tag: "犒劳",
  },
  {
    id: "game-time",
    name: "游戏 30 分钟",
    icon: "🎮",
    price: 60,
    type: "consumable",
    desc: "心安理得地玩 30 分钟",
    accent: "#4f9df0",
    tag: "放松",
  },
];
