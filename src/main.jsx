import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RewardProvider } from "./context/RewardContext";
import { FocusProvider } from "./context/FocusContext";
import { TodoProvider } from "./context/TodoContext";
import { ScenarioProvider } from "./context/ScenarioContext";
import { runMigrations } from "./utils/storage";
import "./index.css";

// 在任何 Context 读取 localStorage 前执行数据迁移
runMigrations();

// RewardProvider 在最外层：金币/资产与具体业务解耦，任意页面均可消费。
// FocusProvider 次外层：它只持有专注选择的 id 集合与记录，
// 不依赖 todos，因此 TodoProvider 可作为子级反向联动（删除/撤销）。
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RewardProvider>
      <FocusProvider>
        <TodoProvider>
          <ScenarioProvider>
            <App />
          </ScenarioProvider>
        </TodoProvider>
      </FocusProvider>
    </RewardProvider>
  </React.StrictMode>,
);
