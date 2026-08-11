import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Archive,
  Map,
  Factory,
  History,
  BarChart3,
  PieChart,
  Zap,
  Layers,
  Gift,
  Sparkles,
  FlaskConical,
  FlaskRound,
  BookOpen,
  Settings,
  Coins,
  Languages,
  Palette,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useTodos } from "@/context/TodoContext";
import { useDDL } from "@/context/DDLContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";
import { useReward, SHOP_ITEMS } from "@/context/RewardContext";
import { useTheme } from "@/context/ThemeContext";
import { useFeatures } from "@/context/FeatureContext";
import { FEATURE_KEYS } from "@/pages/FunctionTree/functionTreeData";
import { LANGUAGES } from "@/i18n/translations";

const NAV_SECTIONS = [
  {
    titleKey: "nav.section.daily",
    items: [
      { to: "/",          labelKey: "nav.home",      Icon: Home },
      { to: "/character", labelKey: "nav.character", Icon: Swords },
      { to: "/skilltree", labelKey: "nav.skilltree", Icon: Network },
      { to: "/wish",      labelKey: "nav.wish",      Icon: Sparkles },
      { to: "/aquarium",  labelKey: "nav.aquarium",  Icon: Fish },
      { to: "/world",     labelKey: "nav.world",     Icon: Map },
      { to: "/industry",  labelKey: "nav.industry",  Icon: Factory },
      { to: "/focus",     labelKey: "nav.focus",     Icon: Timer },
      { to: "/flasks",    labelKey: "nav.flasks",    Icon: FlaskRound },
      { to: "/tasks",     labelKey: "nav.tasks",     Icon: ListTodo },
      { to: "/memo",  labelKey: "nav.memo",  Icon: StickyNote },
      { to: "/ddl",   labelKey: "nav.ddl",   Icon: CalendarClock },
    ],
  },
  // 回顾区四页各管一件事，别互相塞摘要：
  // 时间轴=何时发生 / 历史记录=原始流水 / 数据分析=所有统计图表 / 分心统计=只管分心。
  {
    titleKey: "nav.section.review",
    items: [
      { to: "/calendar",       labelKey: "nav.calendar",      Icon: CalendarRange },
      { to: "/history",        labelKey: "nav.history",       Icon: History },
      { to: "/analytics",      labelKey: "nav.analytics",     Icon: BarChart3 },
      { to: "/distraction",    labelKey: "nav.distraction",   Icon: Zap },
      { to: "/scenario-stats", labelKey: "nav.scenarioStats", Icon: PieChart },
    ],
  },
  {
    titleKey: "nav.section.config",
    items: [
      { to: "/gantt",        labelKey: "nav.gantt",        Icon: GanttChartSquare },
      { to: "/tutorial",     labelKey: "nav.tutorial",     Icon: BookOpen },
      { to: "/functiontree", labelKey: "nav.functiontree", Icon: ListTree },
      { to: "/deprecated",   labelKey: "nav.deprecated",   Icon: Archive },
      { to: "/scenario",     labelKey: "nav.scenario",     Icon: Layers },
      { to: "/reward",       labelKey: "nav.reward",       Icon: Gift },
      { to: "/research",     labelKey: "nav.research",     Icon: FlaskConical },
    ],
  },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { todos } = useTodos();
  const { computeBadgeCount } = useDDL();
  const { scenarios, activeScenarioId, setActiveScenario } = useScenarios();
  const { t, lang, setLang } = useLanguage();
  const { coins, isOwned } = useReward();
  const { activeTheme, setTheme } = useTheme();
  const { isEnabled } = useFeatures();

  // 功能树里被关掉的功能，从导航中隐去；某分区被清空后连标题一起省略。
  const visibleSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => isEnabled(item.to)),
      })).filter((section) => section.items.length > 0),
    [isEnabled],
  );

  const ddlBadge = useMemo(() => computeBadgeCount(todos), [todos, computeBadgeCount]);

  // 已解锁的主题 id 列表（default 永远可用 + 商店里已购买的主题）。
  const unlockedThemes = useMemo(
    () => [
      "default",
      ...SHOP_ITEMS.filter((i) => i.id.startsWith("theme-") && isOwned(i.id)).map(
        (i) => i.id,
      ),
    ],
    [isOwned],
  );

  // 在已解锁主题间循环切换；只有默认主题时，引导去奖励商店解锁。
  const cycleTheme = () => {
    if (unlockedThemes.length <= 1) {
      navigate("/reward");
      return;
    }
    const idx = unlockedThemes.indexOf(activeTheme);
    setTheme(unlockedThemes[(idx + 1) % unlockedThemes.length]);
  };

  // 在支持的语言间循环切换（当前 en / zh）。
  const toggleLang = () => {
    const idx = LANGUAGES.findIndex((l) => l.id === lang);
    setLang(LANGUAGES[(idx + 1) % LANGUAGES.length].id);
  };

  // 移动端抽屉开合。桌面端 CSS 里侧边栏常驻，这个状态只在窄屏生效。
  const [open, setOpen] = useState(false);

  // 桌面端折叠（仿 Notion）：整条侧栏滑出屏幕、主内容铺满。状态持久化。
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "1",
  );
  // 折叠后把光标移到屏幕左缘，侧栏以浮层「窥视」滑入；移开即收回。peek 是临时态。
  const [peek, setPeek] = useState(false);

  // 折叠态挂到 body 上，让主内容区（.app-main）同步铺满。
  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
    if (!collapsed) setPeek(false);
  }, [collapsed]);

  // 路由变化即收起抽屉/窥视（点导航跳转、或浏览器前进后退时）。
  useEffect(() => {
    setOpen(false);
    setPeek(false);
  }, [pathname]);

  // 抽屉打开时按 Esc 关闭。
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={t(open ? "sidebar.closeNav" : "sidebar.openNav")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      <div
        className={`sidebar-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* 桌面端折叠后：贴左缘的隐形热区，鼠标移入即窥视展开 */}
      {collapsed && (
        <div
          className="sidebar-hover-zone"
          onMouseEnter={() => setPeek(true)}
          aria-hidden="true"
        />
      )}

      {/* 桌面端折叠后：左上角常驻的展开按钮（仿 Notion 的 » 把手） */}
      {collapsed && (
        <button
          type="button"
          className={`sidebar-launcher${peek ? " hidden" : ""}`}
          onClick={() => setCollapsed(false)}
          aria-label={t("sidebar.expandNav")}
          title={t("sidebar.expandNav")}
        >
          <PanelLeftOpen size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      <aside
        className={`sidebar${open ? " open" : ""}${collapsed ? " collapsed" : ""}${peek ? " peek" : ""}`}
        onMouseEnter={() => collapsed && setPeek(true)}
        onMouseLeave={() => setPeek(false)}
      >
      <div className="sidebar-brand">
        {/* 不能直接放 icon-192.png：那张图的紫底是写死的像素，换主题时不会变。
            改用 logo-mask.png（同一张图抠出的猫形 alpha 遮罩，形状逐像素一致）：
            底板刷 --accent，遮罩里刷 --on-accent-light，主色一换整个 logo 跟着走。
            遮罩图在 public/ 下，Vite 不处理，故按 BASE_URL 拼绝对路径（同 notify.js）。 */}
        <span
          className="sidebar-brand-logo"
          style={{ "--brand-mask": `url("${import.meta.env.BASE_URL}logo-mask.png")` }}
          aria-hidden="true"
        />
        <span className="sidebar-brand-name">Focus Lab</span>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={t(collapsed ? "sidebar.expandNav" : "sidebar.collapseNav")}
          title={t(collapsed ? "sidebar.expandNav" : "sidebar.collapseNav")}
        >
          <PanelLeftClose size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* 「当前情景」不是页面，但也是功能树上的一个开关（挂在情境功能组下） */}
      {scenarios.length > 0 && isEnabled(FEATURE_KEYS.SCENARIO_PICKER) && (
        <div className="sidebar-scenario">
          <label className="sidebar-scenario-label" htmlFor="sidebar-scenario-select">
            {t("sidebar.currentScenario")}
          </label>
          <select
            id="sidebar-scenario-select"
            className={`sidebar-scenario-select${activeScenarioId ? " active" : ""}`}
            value={activeScenarioId ?? ""}
            onChange={(e) => setActiveScenario(e.target.value || null)}
          >
            <option value="">{t("sidebar.noScenario")}</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="sidebar-nav">
        {visibleSections.map(({ titleKey, items }) => (
          <div key={titleKey} className="nav-section">
            <p className="nav-section-title">{t(titleKey)}</p>
            {items.map(({ to, labelKey, Icon }) => (
              <Link key={to} to={to} className={`nav-link${pathname === to ? " active" : ""}`}>
                <Icon className="nav-icon" size={18} strokeWidth={2} aria-hidden="true" />
                <span className="nav-label">{t(labelKey)}</span>
                {to === "/ddl" && ddlBadge > 0 && (
                  <span className="nav-badge">{ddlBadge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link
          to="/reward"
          className="sidebar-coins"
          aria-label={t("sidebar.coins", { count: coins })}
          title={t("sidebar.coins", { count: coins })}
        >
          <Coins size={16} strokeWidth={2} aria-hidden="true" />
          <span className="sidebar-coins-value">{coins}</span>
        </Link>

        <div className="sidebar-footer-actions">
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={toggleLang}
            aria-label={t("sidebar.toggleLang")}
            title={t("sidebar.toggleLang")}
          >
            <Languages size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={cycleTheme}
            aria-label={
              unlockedThemes.length <= 1
                ? t("sidebar.unlockThemes")
                : t("sidebar.cycleTheme")
            }
            title={
              unlockedThemes.length <= 1
                ? t("sidebar.unlockThemes")
                : t("sidebar.cycleTheme")
            }
          >
            <Palette size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <Link
            to="/settings"
            className={`sidebar-icon-btn${pathname === "/settings" ? " active" : ""}`}
            aria-label={t("nav.settings")}
            title={t("nav.settings")}
          >
            <Settings size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
      </aside>
    </>
  );
}
