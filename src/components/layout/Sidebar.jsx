import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTodos } from "../../context/TodoContext";
import { useDDL } from "../../context/DDLContext";
import { useScenarios } from "../../context/ScenarioContext";
import { useLanguage } from "../../context/LanguageContext";

const NAV_SECTIONS = [
  {
    titleKey: "nav.section.daily",
    items: [
      { to: "/",        labelKey: "nav.home" },
      { to: "/focus",   labelKey: "nav.focus" },
      { to: "/tasks",   labelKey: "nav.tasks" },
      { to: "/memo",    labelKey: "nav.memo" },
      { to: "/ddl",     labelKey: "nav.ddl" },
    ],
  },
  {
    titleKey: "nav.section.review",
    items: [
      { to: "/history",        labelKey: "nav.history" },
      { to: "/analytics",      labelKey: "nav.analytics" },
      { to: "/scenario-stats", labelKey: "nav.scenarioStats" },
    ],
  },
  {
    titleKey: "nav.section.config",
    items: [
      { to: "/scenario", labelKey: "nav.scenario" },
      { to: "/reward",   labelKey: "nav.reward" },
      { to: "/settings", labelKey: "nav.settings" },
      { to: "/research", labelKey: "nav.research" },
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

  return (
    <aside className="sidebar">
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
            {items.map(({ to, labelKey }) => (
              <Link key={to} to={to} className={`nav-link${pathname === to ? " active" : ""}`}>
                <span className="nav-label">{t(labelKey)}</span>
                {to === "/ddl" && ddlBadge > 0 && (
                  <span className="nav-badge">{ddlBadge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
