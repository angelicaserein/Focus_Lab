// 功能树数据层：把 App 的各个功能（对应导航项 / 路由）编成三条分支，
// 每个叶子节点都是一个「功能开关」——点一下关掉，再点一下打开，随时可逆。
// 纯数据、与 React 无关，便于 Sidebar / 路由守卫 / 页面复用与单测。
//
// 分支沿用侧边栏的三个分区（daily / review / config），复用 nav.section.* 与 nav.* 文案，
// 不新造一套标题；每个功能的标题就是它在导航里的名字。

// 核心功能：始终开启、不可关闭。只保留最小兜底集——主页、设置、功能树本身，
// 否则用户会失去「回到功能树把东西重新打开」的入口。其余功能（含技能树）都可关。
export const CORE_PATHS = ["/", "/settings", "/functiontree", "/tutorial"];

export const FUNCTION_BRANCHES = [
  {
    id: "daily", // → nav.section.daily
    color: "#6ea8fe",
    features: [
      { path: "/character", labelKey: "nav.character", icon: "⚔️" },
      { path: "/skilltree", labelKey: "nav.skilltree", icon: "🌳" },
      { path: "/wish",      labelKey: "nav.wish",      icon: "✨" },
      { path: "/aquarium",  labelKey: "nav.aquarium",  icon: "🐟" },
      { path: "/world",     labelKey: "nav.world",     icon: "🗺️" },
      { path: "/industry",  labelKey: "nav.industry",  icon: "🏭" },
      { path: "/focus",     labelKey: "nav.focus",     icon: "⏱️" },
      { path: "/tasks",     labelKey: "nav.tasks",     icon: "📋" },
      { path: "/flow-tasks", labelKey: "nav.flowtasks", icon: "🌊" },
      { path: "/memo",      labelKey: "nav.memo",      icon: "📝" },
      { path: "/ddl",       labelKey: "nav.ddl",       icon: "⏰" },
    ],
  },
  {
    id: "review", // → nav.section.review
    color: "#34d399",
    features: [
      { path: "/calendar",       labelKey: "nav.calendar",      icon: "📆" },
      { path: "/gantt",          labelKey: "nav.gantt",         icon: "📊" },
      { path: "/history",        labelKey: "nav.history",       icon: "🕰️" },
      { path: "/analytics",      labelKey: "nav.analytics",     icon: "📈" },
      { path: "/scenario-stats", labelKey: "nav.scenarioStats", icon: "🥧" },
    ],
  },
  {
    id: "config", // → nav.section.config
    color: "#f59e0b",
    features: [
      { path: "/scenario", labelKey: "nav.scenario", icon: "🧩" },
      { path: "/reward",   labelKey: "nav.reward",   icon: "🎁" },
      { path: "/research", labelKey: "nav.research", icon: "🧪" },
    ],
  },
];

// 所有可开关的功能路径（扁平），供路由守卫快速判断。
export const TOGGLEABLE_PATHS = FUNCTION_BRANCHES.flatMap((b) =>
  b.features.map((f) => f.path),
);

export function isCorePath(path) {
  return CORE_PATHS.includes(path);
}
