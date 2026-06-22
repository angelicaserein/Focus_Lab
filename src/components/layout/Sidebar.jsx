import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTodos } from "../../context/TodoContext";
import { useDDL } from "../../context/DDLContext";

const BASE_NAV_ITEMS = [
  { to: "/",              label: "主页" },
  { to: "/focus",         label: "专注" },
  { to: "/tasks",         label: "任务库" },
  { to: "/ddl",           label: "DDL 提醒" },
  { to: "/history",       label: "历史记录" },
  { to: "/scenario",      label: "情景管理" },
  { to: "/scenario-stats", label: "情景统计" },
  { to: "/analytics",     label: "数据分析" },
  { to: "/reward",        label: "奖励" },
  { to: "/settings",      label: "设置" },
  { to: "/research",      label: "研究记录" },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { todos } = useTodos();
  const { computeBadgeCount } = useDDL();

  const ddlBadge = useMemo(() => computeBadgeCount(todos), [todos, computeBadgeCount]);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {BASE_NAV_ITEMS.map(({ to, label }) => (
          <Link key={to} to={to} className={`nav-link${pathname === to ? " active" : ""}`}>
            <span className="nav-label">{label}</span>
            {to === "/ddl" && ddlBadge > 0 && (
              <span className="nav-badge">{ddlBadge}</span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
