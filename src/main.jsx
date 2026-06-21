import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { RewardProvider } from "./context/RewardContext";
import { FocusProvider } from "./context/FocusContext";
import { TodoProvider } from "./context/TodoContext";
import { ScenarioProvider } from "./context/ScenarioContext";
import { TaskAttrProvider } from "./context/TaskAttrContext";
import { runMigrations } from "./utils/storage";
import "./index.css";

// 在任何 Context 读取 localStorage 前执行数据迁移
runMigrations();

// ThemeProvider 最外层：主题写入 <html data-theme>，RewardProvider 内部可调用 useTheme().setTheme。
// RewardProvider 次层：金币/资产与具体业务解耦，任意页面均可消费。
// FocusProvider 再次：只持有专注选择 id 集合与记录，TodoProvider 可作为子级反向联动。
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <RewardProvider>
        <FocusProvider>
          <TaskAttrProvider>
            <TodoProvider>
              <ScenarioProvider>
                <App />
              </ScenarioProvider>
            </TodoProvider>
          </TaskAttrProvider>
        </FocusProvider>
      </RewardProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
