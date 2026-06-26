// 商品目录（静态配置，无需持久化）。
//   type: "unlock"     — 买过即拥有，不可重复买。
//   type: "consumable" — 可反复兑换，记录次数。
export const SHOP_ITEMS = [
  {
    id: "theme-pink",
    name: "粉色主题",
    icon: "🌸",
    price: 30,
    type: "unlock",
    desc: "解锁一套柔和的粉色界面皮肤",
  },
  {
    id: "theme-night",
    name: "暗夜皮肤",
    icon: "🌙",
    price: 50,
    type: "unlock",
    desc: "解锁深色护眼的暗夜界面",
  },
  {
    id: "milk-tea",
    name: "奶茶券",
    icon: "🧋",
    price: 10,
    type: "consumable",
    desc: "奖励自己一杯奶茶",
  },
  {
    id: "dessert",
    name: "甜点奖励",
    icon: "🍰",
    price: 20,
    type: "consumable",
    desc: "来块蛋糕犒劳一下",
  },
  {
    id: "game-time",
    name: "游戏 30 分钟",
    icon: "🎮",
    price: 60,
    type: "consumable",
    desc: "心安理得地玩 30 分钟",
  },
];
