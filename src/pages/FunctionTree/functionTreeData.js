// 功能树数据层：把 App 的各个功能（对应导航项 / 路由）编成三条分支，
// 每个叶子节点都是一个「功能开关」——点一下关掉，再点一下打开，随时可逆。
// 纯数据、与 React 无关，便于 Sidebar / 路由守卫 / 页面复用与单测。
//
// 分支沿用侧边栏的三个分区（daily / review / config），复用 nav.section.* 与 nav.* 文案，
// 不新造一套标题；每个功能的标题就是它在导航里的名字。
//
// 两种节点：
//   叶子 { path }  —— 一个页面，path 同时是路由与开关 key；
//   叶子 { key }   —— 不是页面的功能件（如侧边栏的「当前情景」选择器），只有开关 key；
//   组   { key, children } —— 一族功能的总开关。关掉组 = 组内全部隐去且不可达，
//     但**不改写**子项各自的记忆，重开组即恢复原样。
// 组是「视觉与语义的聚合」，不要求与侧边栏分区一一对应：功能树是开关面板，
// 侧边栏是日常动线，情境统计留在侧边栏的「回顾」区，在这棵树里却挂进情境组。

// 核心功能：始终开启、不可关闭。只保留最小兜底集——主页、设置、功能树、废弃页面，
// 否则用户会失去「回到开关页把东西重新打开」的入口。其余功能都可关。
export const CORE_PATHS = ["/", "/settings", "/functiontree", "/deprecated"];

// 已退居二线的旧功能（角色 / 技能树 / 祈愿 / 世界地图 / 工业点数 / 甘特图 / 教程 / 研究记录）
// 不在这棵树里，它们搬去了「废弃页面」——见 pages/Deprecated/deprecatedData，那边默认全关。

// 非路由的开关 key。用 "前缀:名字" 与路由（一律以 / 开头）区分，避免撞车。
export const FEATURE_KEYS = {
  SCENARIO_GROUP: "group:scenario",
  SCENARIO_PICKER: "scenario:picker",
};

export const FUNCTION_BRANCHES = [
  {
    id: "daily", // → nav.section.daily
    color: "#6ea8fe",
    features: [
      { path: "/aquarium",  labelKey: "nav.aquarium",  icon: "🐟" },
      { path: "/focus",     labelKey: "nav.focus",     icon: "⏱️" },
      { path: "/flasks",    labelKey: "nav.flasks",    icon: "⚗️" },
      { path: "/tasks",     labelKey: "nav.tasks",     icon: "📋" },
      { path: "/memo",      labelKey: "nav.memo",      icon: "📝" },
      { path: "/ddl",       labelKey: "nav.ddl",       icon: "⏰" },
    ],
  },
  {
    id: "review", // → nav.section.review
    color: "#34d399",
    features: [
      { path: "/calendar",       labelKey: "nav.calendar",      icon: "📆" },
      { path: "/analytics",      labelKey: "nav.analytics",     icon: "📈" },
      { path: "/distraction",    labelKey: "nav.distraction",   icon: "⚡" },
    ],
  },
  {
    id: "config", // → nav.section.config
    color: "#f59e0b",
    features: [
      {
        key: FEATURE_KEYS.SCENARIO_GROUP,
        labelKey: "functiontree.group.scenario",
        icon: "🧩",
        children: [
          { path: "/scenario",       labelKey: "nav.scenario",            icon: "⚙️" },
          { path: "/scenario-stats", labelKey: "nav.scenarioStats",       icon: "🥧" },
          { key: FEATURE_KEYS.SCENARIO_PICKER, labelKey: "sidebar.currentScenario", icon: "🎚️" },
        ],
      },
      { path: "/reward", labelKey: "nav.reward", icon: "🎁" },
    ],
  },
];

// 一个节点的开关 key：页面用它的路由，非页面功能件用自带的 key。
export function featureKey(feature) {
  return feature.path ?? feature.key;
}

// 一个节点自身 + 其子节点的所有 key（组用来算「x/y 已开启」）。
export function featureKeys(feature) {
  return [featureKey(feature), ...(feature.children ?? []).map(featureKey)];
}

// 所有可开关的功能 key（扁平，含组自身与非路由功能件），供路由守卫与计数快速判断。
export const TOGGLEABLE_PATHS = FUNCTION_BRANCHES.flatMap((b) =>
  b.features.flatMap(featureKeys),
);

// 子 key → 所属组 key。组一关，组内子项一律视为关闭（见 FeatureContext.isEnabled）。
const PARENT_OF = new Map(
  FUNCTION_BRANCHES.flatMap((b) =>
    b.features.flatMap((f) =>
      (f.children ?? []).map((c) => [featureKey(c), featureKey(f)]),
    ),
  ),
);

export function parentKeyOf(key) {
  return PARENT_OF.get(key) ?? null;
}

export function isCorePath(path) {
  return CORE_PATHS.includes(path);
}
