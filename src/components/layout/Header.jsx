import React from "react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header" style={{ padding: 8 }}>
      <nav>
        <Link to="/">Home</Link>
        {" | "}
        <Link to="/focus">Focus</Link>
      </nav>
    </header>
  );
}
