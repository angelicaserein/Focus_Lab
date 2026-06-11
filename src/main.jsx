import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { TodoProvider } from "./context/TodoContext";
import { ExtensionProvider } from "./context/ExtensionContext";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ExtensionProvider 为未来扩展留壳 */}
    <ExtensionProvider>
      <TodoProvider>
        <App />
      </TodoProvider>
    </ExtensionProvider>
  </React.StrictMode>,
);
