import React from "react";
import { createRoot } from "react-dom/client";
import PetApp from "@/pet/PetApp";
import "@/pet/PetApp.css";

// 桌宠窗入口。注意这里没有 AppProviders、没有 Router、没有 runMigrations：
// 桌宠不持有任何数据，状态全部由主窗口经 IPC 推过来（见 electron/main.cjs 顶部注释）。
// StrictMode 也省了——双次挂载会让「鼠标穿透」的订阅短暂重复注册，没必要为此加防抖。
createRoot(document.getElementById("pet-root")).render(<PetApp />);
