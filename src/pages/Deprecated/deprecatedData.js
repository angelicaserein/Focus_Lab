// 废弃页面数据层：那些不再进主线、但也不想删掉的旧功能。
// 形态与功能树相同（一串可逆的开关），但名单是**反向**的：这里的功能默认全部关闭，
// 只有用户在这一页主动打开，它才回到侧边栏、路由才放行。
// 纯数据、与 React 无关，供 FeatureContext / 路由守卫 / 页面共用。

export const DEPRECATED_FEATURES = [
  { path: "/character", labelKey: "nav.character", icon: "⚔️" },
  { path: "/skilltree", labelKey: "nav.skilltree", icon: "🌳" },
  { path: "/wish",      labelKey: "nav.wish",      icon: "✨" },
  { path: "/world",     labelKey: "nav.world",     icon: "🗺️" },
  { path: "/industry",  labelKey: "nav.industry",  icon: "🏭" },
  { path: "/gantt",     labelKey: "nav.gantt",     icon: "📊" },
  { path: "/tutorial",  labelKey: "nav.tutorial",  icon: "📖" },
];

export const DEPRECATED_PATHS = DEPRECATED_FEATURES.map((f) => f.path);

export function isDeprecatedPath(path) {
  return DEPRECATED_PATHS.includes(path);
}
