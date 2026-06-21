import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
          <span className="nav-label">Home</span>
        </Link>
        <Link to="/focus" className={`nav-link ${isActive("/focus") ? "active" : ""}`}>
          <span className="nav-label">Focus</span>
        </Link>
        <Link to="/history" className={`nav-link ${isActive("/history") ? "active" : ""}`}>
          <span className="nav-label">History</span>
        </Link>
        <Link to="/scenario" className={`nav-link ${isActive("/scenario") ? "active" : ""}`}>
          <span className="nav-label">Scenario</span>
        </Link>
        <Link to="/scenario-stats" className={`nav-link ${isActive("/scenario-stats") ? "active" : ""}`}>
          <span className="nav-label">情景统计</span>
        </Link>
        <Link to="/analytics" className={`nav-link ${isActive("/analytics") ? "active" : ""}`}>
          <span className="nav-label">数据分析</span>
        </Link>
        <Link to="/reward" className={`nav-link ${isActive("/reward") ? "active" : ""}`}>
          <span className="nav-label">Reward</span>
        </Link>
        <Link to="/settings" className={`nav-link ${isActive("/settings") ? "active" : ""}`}>
          <span className="nav-label">Settings</span>
        </Link>
        <Link to="/research" className={`nav-link ${isActive("/research") ? "active" : ""}`}>
          <span className="nav-label">研究记录</span>
        </Link>
      </nav>
    </aside>
  );
}
