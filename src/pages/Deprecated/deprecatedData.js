// 废弃页面数据层：那些不再进主线、但也不想删掉的旧功能。
// 形态与功能树相同（一串可逆的开关），但名单是**反向**的：这里的功能默认全部关闭，
// 只有用户在这一页主动打开，它才回到侧边栏、路由才放行。
// 纯数据、与 React 无关，供 FeatureContext / 路由守卫 / 页面共用。
import { FEATURE_KEYS } from "@/pages/FunctionTree/functionTreeData";

// 条目的开关 key：页面用它的路由（path），非页面的功能件用 "前缀:名字"（key）。
// 带 children 的条目是一族功能的总开关（如情境功能），children 里只写子项的 key——
// 它们没有各自的开关，一律跟着组走：这一页是「捡不捡回来」，不是再来一次精细配置。
export const DEPRECATED_FEATURES = [
  { path: "/character", labelKey: "nav.character", icon: "⚔️" },
  { path: "/skilltree", labelKey: "nav.skilltree", icon: "🌳" },
  { path: "/wish",      labelKey: "nav.wish",      icon: "✨" },
  { path: "/world",     labelKey: "nav.world",     icon: "🗺️" },
  { path: "/industry",  labelKey: "nav.industry",  icon: "🏭" },
  { path: "/gantt",     labelKey: "nav.gantt",     icon: "📊" },
  { path: "/tutorial",  labelKey: "nav.tutorial",  icon: "📖" },
  {
    key: FEATURE_KEYS.SCENARIO_GROUP,
    labelKey: "functiontree.group.scenario",
    icon: "🧩",
    children: ["/scenario", "/scenario-stats", FEATURE_KEYS.SCENARIO_PICKER],
  },
];

export function deprecatedKey(feature) {
  return feature.path ?? feature.key;
}

// 这一页上真正可点的开关（顶层条目），页面渲染与「已捡回 x/y」都按它算。
export const DEPRECATED_PATHS = DEPRECATED_FEATURES.map(deprecatedKey);

// 顶层 + 组内子项：判断「这个 key 归废弃名单管」用它，别用上面那个。
export const DEPRECATED_ALL_KEYS = DEPRECATED_FEATURES.flatMap((f) => [
  deprecatedKey(f),
  ...(f.children ?? []),
]);

// 子 key → 所属组 key。组开则子项全开，组关则全关（子项没有自己的记忆）。
const PARENT_OF = new Map(
  DEPRECATED_FEATURES.flatMap((f) =>
    (f.children ?? []).map((c) => [c, deprecatedKey(f)]),
  ),
);

export function deprecatedParentOf(key) {
  return PARENT_OF.get(key) ?? null;
}

export function isDeprecatedPath(path) {
  return DEPRECATED_ALL_KEYS.includes(path);
}
