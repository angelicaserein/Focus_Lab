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
      </nav>
    </aside>
  );
}
