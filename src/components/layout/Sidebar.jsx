import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Timer,
  ListTodo,
  StickyNote,
  CalendarClock,
  History,
  BarChart3,
  PieChart,
  Layers,
  Gift,
  FlaskConical,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useTodos } from "@/context/TodoContext";
import { useDDL } from "@/context/DDLContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";

const NAV_SECTIONS = [
  {
    titleKey: "nav.section.daily",
    items: [
      { to: "/",      labelKey: "nav.home",  Icon: Home },
      { to: "/focus", labelKey: "nav.focus", Icon: Timer },
      { to: "/tasks", labelKey: "nav.tasks", Icon: ListTodo },
      { to: "/memo",  labelKey: "nav.memo",  Icon: StickyNote },
      { to: "/ddl",   labelKey: "nav.ddl",   Icon: CalendarClock },
    ],
  },
  {
    titleKey: "nav.section.review",
    items: [
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
  const { todos } = useTodos();
  const { computeBadgeCount } = useDDL();
  const { scenarios, activeScenarioId, setActiveScenario } = useScenarios();
  const { t } = useLanguage();

  const ddlBadge = useMemo(() => computeBadgeCount(todos), [todos, computeBadgeCount]);

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
          to="/settings"
          className={`nav-link${pathname === "/settings" ? " active" : ""}`}
        >
          <Settings className="nav-icon" size={18} strokeWidth={2} aria-hidden="true" />
          <span className="nav-label">{t("nav.settings")}</span>
        </Link>
      </div>
      </aside>
    </>
  );
}
