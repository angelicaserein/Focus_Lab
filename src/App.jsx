import React from "react";
import { HashRouter } from "react-router-dom";
import AppRoutes from "@/routes/AppRoutes";
import DDLReminderModal from "@/components/ddl/DDLReminderModal";
import TaskReminderModal from "@/components/reminder/TaskReminderModal";
import DesktopHost from "@/components/desktop/DesktopHost";
import StorageQuotaBanner from "@/components/ui/StorageQuotaBanner";
import PrivacyNoticeHost from "@/components/privacy/PrivacyNoticeHost";

export default function App() {
  return (
    <HashRouter>
      <div className="app-root">
        {/* 首次打开时的隐私告知，看过一次后不再渲染 */}
        <PrivacyNoticeHost />
        {/* localStorage 写满时的警报，平时不渲染任何东西 */}
        <StorageQuotaBanner />
        {/* 桌面版（Electron）与桌宠窗的对接层；浏览器里是个空组件 */}
        <DesktopHost />
        <AppRoutes />
        <DDLReminderModal />
        <TaskReminderModal />
      </div>
    </HashRouter>
  );
}
