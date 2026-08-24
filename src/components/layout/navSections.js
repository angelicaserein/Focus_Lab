// 侧边栏的导航结构。抽出来单独成篇，是因为跨页搜索也要照着同一份表列出「页面」结果——
// 两处各写一份的话，加个页面必然漏掉一边。
// 分区顺序即显示顺序；每项的 labelKey 去 i18n/nav.js 取名字。
import {
  Home,
  Timer,
  ListTodo,
  StickyNote,
  CalendarClock,
  CalendarRange,
  GanttChartSquare,
  Swords,
  Network,
  Fish,
  ListTree,
  Map,
  Factory,
  BarChart3,
  PieChart,
  Zap,
  Layers,
  Gift,
  Sparkles,
  FlaskRound,
  BookOpen,
} from "lucide-react";

export const NAV_SECTIONS = [
  // 主页单独领头，不归任何分区——它是回到一切的入口，别埋在「每日」列表中间。
  {
    id: "home",
    items: [{ to: "/", labelKey: "nav.home", Icon: Home }],
  },
  {
    id: "daily",
    titleKey: "nav.section.daily",
    items: [
      { to: "/focus",     labelKey: "nav.focus",     Icon: Timer },
      { to: "/tasks",     labelKey: "nav.tasks",     Icon: ListTodo },
      { to: "/memo",      labelKey: "nav.memo",      Icon: StickyNote },
      { to: "/ddl",       labelKey: "nav.ddl",       Icon: CalendarClock },
      { to: "/character", labelKey: "nav.character", Icon: Swords },
      { to: "/skilltree", labelKey: "nav.skilltree", Icon: Network },
      { to: "/world",     labelKey: "nav.world",     Icon: Map },
      { to: "/industry",  labelKey: "nav.industry",  Icon: Factory },
    ],
  },
  // 奖励系统：金币商店 + 祈愿抽取 + 收集展示（生态缸 / 标本瓶架）都是同一条「攒→换→看」的线。
  {
    id: "rewards",
    titleKey: "nav.section.rewards",
    items: [
      { to: "/reward",   labelKey: "nav.reward",   Icon: Gift },
      { to: "/wish",     labelKey: "nav.wish",     Icon: Sparkles },
      { to: "/aquarium", labelKey: "nav.aquarium", Icon: Fish },
      { to: "/flasks",   labelKey: "nav.flasks",   Icon: FlaskRound },
    ],
  },
  // 回顾三页各管一件事，别互相塞摘要：
  // 时间轴=何时发生 + 原始流水 / 数据分析=所有统计图表 / 分心统计=只管分心。
  {
    id: "review",
    titleKey: "nav.section.review",
    items: [
      { to: "/calendar",       labelKey: "nav.calendar",      Icon: CalendarRange },
      { to: "/analytics",      labelKey: "nav.analytics",     Icon: BarChart3 },
      { to: "/distraction",    labelKey: "nav.distraction",   Icon: Zap },
      { to: "/scenario-stats", labelKey: "nav.scenarioStats", Icon: PieChart },
    ],
  },
  {
    id: "config",
    titleKey: "nav.section.config",
    items: [
      { to: "/gantt",        labelKey: "nav.gantt",        Icon: GanttChartSquare },
      { to: "/tutorial",     labelKey: "nav.tutorial",     Icon: BookOpen },
      { to: "/functiontree", labelKey: "nav.functiontree", Icon: ListTree },
      { to: "/scenario",     labelKey: "nav.scenario",     Icon: Layers },
    ],
  },
];

// 摊平成一维的页面列表，每项记住自己属于哪个分区（搜索结果里用作副标题）。
// 设置页不在 NAV_SECTIONS 里（它在侧栏底部的图标区），废弃页面则只从设置页底部的小字进得去——
// 两页都不该在侧栏露面，但搜索该找得到，故在此补上。
export const NAV_PAGES = [
  ...NAV_SECTIONS.flatMap(({ titleKey, items }) =>
    items.map(({ to, labelKey }) => ({ to, labelKey, sectionKey: titleKey })),
  ),
  { to: "/settings",   labelKey: "nav.settings",   sectionKey: "nav.section.config" },
  { to: "/deprecated", labelKey: "nav.deprecated", sectionKey: "nav.section.config" },
];

// 路径 → 页面名的 i18n key。沉浸专注的「看看别的页面」用它给浮层导航取名，
// 分心明细也用它把记下的路径还原成当前语言的页面名（记录里存的是路径，不是译文，
// 切语言后旧记录才不会僵在另一种语言上）。
export const PAGE_LABEL_KEYS = Object.fromEntries(
  NAV_PAGES.map(({ to, labelKey }) => [to, labelKey]),
);

export default NAV_SECTIONS;
