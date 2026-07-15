import React from "react";
import { HashRouter } from "react-router-dom";
import AppRoutes from "@/routes/AppRoutes";
import DDLReminderModal from "@/components/ddl/DDLReminderModal";
import TaskReminderModal from "@/components/reminder/TaskReminderModal";

export default function App() {
  return (
    <HashRouter>
      <div className="app-root">
        <AppRoutes />
        <DDLReminderModal />
        <TaskReminderModal />
      </div>
    </HashRouter>
  );
}
