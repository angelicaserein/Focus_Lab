import React from "react";
import { HashRouter } from "react-router-dom";
import AppRoutes from "@/routes/AppRoutes";
import DDLReminderModal from "@/components/ddl/DDLReminderModal";
import TaskReminderModal from "@/components/reminder/TaskReminderModal";
import DesktopHost from "@/components/desktop/DesktopHost";

export default function App() {
  return (
    <HashRouter>
      <div className="app-root">
        {/* 桌面版（Electron）与桌宠窗的对接层；浏览器里是个空组件 */}
        <DesktopHost />
        <AppRoutes />
        <DDLReminderModal />
        <TaskReminderModal />
      </div>
    </HashRouter>
  );
}
