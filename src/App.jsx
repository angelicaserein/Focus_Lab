import React from "react";
import { HashRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import DDLReminderModal from "./components/DDLReminderModal";

export default function App() {
  return (
    <HashRouter>
      <div className="app-root">
        <AppRoutes />
        <DDLReminderModal />
      </div>
    </HashRouter>
  );
}
