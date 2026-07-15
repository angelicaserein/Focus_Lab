import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import AppProviders from "@/AppProviders";
import { runMigrations } from "@/utils/storage/storage";
import registerSW from "@/utils/registerSW";
import "./index.css";

// 在任何 Context 读取 localStorage 前执行数据迁移
runMigrations();

// 注册 PWA service worker（仅生产环境生效）
registerSW();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
