import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Timer,
  ListTodo,
  StickyNote,
  CalendarClock,
  CalendarRange,
  Swords,
  History,
  BarChart3,
  PieChart,
  Layers,
  Gift,
  FlaskConical,
  Settings,
  Coins,
  Languages,
  Palette,
  Menu,
  X,
} from "lucide-react";
import { useTodos } from "@/context/TodoContext";
import { useDDL } from "@/context/DDLContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";
import { useReward, SHOP_ITEMS } from "@/context/RewardContext";
import { useTheme } from "@/context/ThemeContext";
import { LANGUAGES } from "@/i18n/translations";

const NAV_SECTIONS = [
  {
    titleKey: "nav.section.daily",
    items: [
      { to: "/",          labelKey: "nav.home",      Icon: Home },
      { to: "/character", labelKey: "nav.character", Icon: Swords },
      { to: "/focus",     labelKey: "nav.focus",     Icon: Timer },
      { to: "/tasks",     labelKey: "nav.tasks",     Icon: ListTodo },
      { to: "/memo",  labelKey: "nav.memo",  Icon: StickyNote },
      { to: "/ddl",   labelKey: "nav.ddl",   Icon: CalendarClock },
    ],
  },
  {
    titleKey: "nav.section.review",
    items: [
      { to: "/calendar",       labelKey: "nav.calendar",      Icon: CalendarRange },
      { to: "/history",        labelKey: "nav.history",       Icon: History },
      { to: "/analytics",      labelKey: "nav.analytics",     Icon: BarChart3 },
      { to: "/scenario-stats", labelKey: "nav.scenarioStats", Icon: PieChart },
    ],
  },
  {
    titleKey: "nav.section.config",
    items: [
      { to: "/scenario", labelKey: "nav.scenario", Icon: Layers },
      { to: "/reward",   labelKey: "nav.reward",   Icon: Gift },
      { to: "/research", labelKey: "nav.research", Icon: FlaskConical },
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

  // 路由变化即收起抽屉（点导航跳转、或浏览器前进后退时）。
  useEffect(() => {
    setOpen(false);
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

      <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sidebar-brand">
        <img className="sidebar-brand-logo" src="./icon-192.png" alt="" />
        <span className="sidebar-brand-name">Focus Lab</span>
      </div>

      {scenarios.length > 0 && (
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
        {NAV_SECTIONS.map(({ titleKey, items }) => (
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
