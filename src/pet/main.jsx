import React from "react";
import { createRoot } from "react-dom/client";
import PetApp from "@/pet/PetApp";
// 只借主题的变量表（纯 :root 变量，不含任何元素样式，几 KB），
// 桌宠才能跟着主窗口换皮。data-theme 由 PetApp 按推送过来的主题写到 <html> 上。
import "@/styles/theme.css";
import "@/pet/PetApp.css";

// 桌宠窗入口。注意这里没有 AppProviders、没有 Router、没有 runMigrations：
// 桌宠不持有任何数据，状态全部由主窗口经 IPC 推过来（见 electron/main.cjs 顶部注释）。
// StrictMode 也省了——双次挂载会让「鼠标穿透」的订阅短暂重复注册，没必要为此加防抖。
createRoot(document.getElementById("pet-root")).render(<PetApp />);
