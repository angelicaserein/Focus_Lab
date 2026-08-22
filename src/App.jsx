import React from "react";
import { HashRouter } from "react-router-dom";
import AppRoutes from "@/routes/AppRoutes";
import DDLReminderModal from "@/components/ddl/DDLReminderModal";
import DesktopHost from "@/components/desktop/DesktopHost";
import StorageQuotaBanner from "@/components/ui/StorageQuotaBanner";
import PrivacyNoticeHost from "@/components/privacy/PrivacyNoticeHost";
import ImmersiveBrowserHost from "@/components/focus/ImmersiveBrowserHost";
import { PageBrowsingProvider } from "@/context/PageBrowsingContext";

export default function App() {
  return (
    <PageBrowsingProvider>
      <div className="app-root">
        {/* 沉浸专注里的「看看别的页面」浮层。它自带一个 MemoryRouter，
            而 Router 不能套 Router，所以挂在 HashRouter 外面这一格。 */}
        <ImmersiveBrowserHost />
        {/* 首次打开时的隐私告知，看过一次后不再渲染 */}
        <PrivacyNoticeHost />
        {/* localStorage 写满时的警报，平时不渲染任何东西 */}
        <StorageQuotaBanner />
        <HashRouter>
          {/* 桌面版（Electron）与桌宠窗的对接层；浏览器里是个空组件 */}
          <DesktopHost />
          <AppRoutes />
          <DDLReminderModal />
        </HashRouter>
      </div>
    </PageBrowsingProvider>
  );
}
