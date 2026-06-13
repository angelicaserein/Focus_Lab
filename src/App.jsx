import React from "react";
import { HashRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <HashRouter>
      <div className="app-root">
        <AppRoutes />
      </div>
    </HashRouter>
  );
}
