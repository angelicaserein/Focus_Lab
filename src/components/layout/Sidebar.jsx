import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTodos } from "../../context/TodoContext";
import { useDDL } from "../../context/DDLContext";
import { useScenarios } from "../../context/ScenarioContext";

const NAV_SECTIONS = [
  {
    title: "每日",
    items: [
      { to: "/",        label: "主页" },
      { to: "/focus",   label: "专注" },
      { to: "/tasks",   label: "任务库" },
      { to: "/memo",    label: "备忘录" },
      { to: "/ddl",     label: "DDL 提醒" },
    ],
  },
  {
    title: "回顾",
    items: [
      { to: "/history",        label: "历史记录" },
      { to: "/analytics",      label: "数据分析" },
      { to: "/scenario-stats", label: "情景统计" },
    ],
  },
  {
    title: "配置",
    items: [
      { to: "/scenario", label: "情境配置" },
      { to: "/reward",   label: "奖励" },
      { to: "/settings", label: "设置" },
      { to: "/research", label: "研究记录" },
    ],
  },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { todos } = useTodos();
  const { computeBadgeCount } = useDDL();
  const { scenarios, activeScenarioId, setActiveScenario } = useScenarios();

  const ddlBadge = useMemo(() => computeBadgeCount(todos), [todos, computeBadgeCount]);

  return (
    <aside className="sidebar">
      {scenarios.length > 0 && (
        <div className="sidebar-scenario">
          <label className="sidebar-scenario-label" htmlFor="sidebar-scenario-select">
            当前情景
          </label>
          <select
            id="sidebar-scenario-select"
            className={`sidebar-scenario-select${activeScenarioId ? " active" : ""}`}
            value={activeScenarioId ?? ""}
            onChange={(e) => setActiveScenario(e.target.value || null)}
          >
            <option value="">无情景</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(({ title, items }) => (
          <div key={title} className="nav-section">
            <p className="nav-section-title">{title}</p>
            {items.map(({ to, label }) => (
              <Link key={to} to={to} className={`nav-link${pathname === to ? " active" : ""}`}>
                <span className="nav-label">{label}</span>
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
