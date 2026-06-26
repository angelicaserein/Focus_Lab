import React, { useContext, useEffect } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";

// 管理应用主题：localStorage 持久化 + 写入 <html data-theme>。
// 放在 Provider 树最外层，确保 RewardProvider 内部可通过 useTheme() 调用 setTheme。
const ThemeContext = React.createContext(null);

export function ThemeProvider({ children }) {
  const [activeTheme, setTheme] = useLocalStorage(STORAGE_KEYS.ACTIVE_THEME, "default");

  useEffect(() => {
    if (!activeTheme || activeTheme === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", activeTheme.replace("theme-", ""));
    }
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
