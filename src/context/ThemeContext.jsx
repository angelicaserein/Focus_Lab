import React, { useContext, useEffect, useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";

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

  // 这是 Provider 树最外层，重渲会一路刷到底：value 必须 memo，
  // 否则内联对象字面量每次都是新引用，全部 useTheme() 消费者跟着白重渲一遍。
  const value = useMemo(() => ({ activeTheme, setTheme }), [activeTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
