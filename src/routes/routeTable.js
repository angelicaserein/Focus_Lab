// 路由表：每项描述一个页面。core 为真的是核心功能，始终可达；
// 其余为可开关功能，被功能树关掉时直接访问会弹回主页。
// importer 既喂给 lazy() 拆分 chunk，也用于「空闲预取」。
//
// 单独成篇是因为沉浸专注层的「看看别的页面」也要照着同一份表把页面渲染进浮层——
// 两处各写一份的话，加个页面必然漏掉一边。
export const ROUTES = [
  { path: "/",               importer: () => import("@/pages/Home"),         core: true },
  { path: "/settings",       importer: () => import("@/pages/Settings"),     core: true },
  { path: "/functiontree",   importer: () => import("@/pages/FunctionTree"), core: true },
  { path: "/deprecated",     importer: () => import("@/pages/Deprecated"),   core: true },
  { path: "/tutorial",       importer: () => import("@/pages/Tutorial") },
  { path: "/skilltree",      importer: () => import("@/pages/SkillTree") },
  { path: "/focus",          importer: () => import("@/pages/Focus") },
  { path: "/flasks",         importer: () => import("@/pages/Flasks") },
  { path: "/scenario",       importer: () => import("@/pages/Scenario") },
  { path: "/reward",         importer: () => import("@/pages/Reward") },
  { path: "/scenario-stats", importer: () => import("@/pages/ScenarioStats") },
  { path: "/analytics",      importer: () => import("@/pages/Analytics") },
  { path: "/distraction",    importer: () => import("@/pages/Distraction") },
  { path: "/tasks",          importer: () => import("@/pages/Tasks") },
  { path: "/ddl",            importer: () => import("@/pages/DDLReminders") },
  { path: "/memo",           importer: () => import("@/pages/Memo") },
  { path: "/calendar",       importer: () => import("@/pages/Calendar") },
  { path: "/character",      importer: () => import("@/pages/Character") },
  { path: "/industry",       importer: () => import("@/pages/Industry") },
  { path: "/gantt",          importer: () => import("@/pages/Gantt") },
  { path: "/wish",           importer: () => import("@/pages/Wish") },
  { path: "/aquarium",       importer: () => import("@/pages/Aquarium") },
  { path: "/world",          importer: () => import("@/pages/World") },
];

export default ROUTES;
