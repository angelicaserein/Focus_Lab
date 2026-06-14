import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FocusProvider } from "./context/FocusContext";
import { TodoProvider } from "./context/TodoContext";
import { ScenarioProvider } from "./context/ScenarioContext";
import "./index.css";

// FocusProvider 在外层：它只持有专注选择的 id 集合与记录，
// 不依赖 todos，因此 TodoProvider 可作为子级反向联动（删除/撤销）。
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FocusProvider>
      <TodoProvider>
        <ScenarioProvider>
          <App />
        </ScenarioProvider>
      </TodoProvider>
    </FocusProvider>
  </React.StrictMode>,
);
