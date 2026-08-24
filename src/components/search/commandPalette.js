import { useEffect } from "react";

// 命令面板的「打开」信号。搜索框长在侧栏顶部，而侧栏可以折叠 / 在窄屏是抽屉——
// 快捷键要能在这两种情况下都把它露出来，所以按键这一下不直接操作 DOM，
// 而是广播一个事件：GlobalSearch 收到后聚焦输入框，Sidebar 收到后把自己展开。
// 两边各管各的，谁都不用拿到对方的 ref。
const PALETTE_EVENT = "focuslab:open-palette";

export const openPalette = () => window.dispatchEvent(new CustomEvent(PALETTE_EVENT));

/** 订阅「打开命令面板」。handler 每次渲染换引用也没关系，这里按需重绑。 */
export function useOpenPalette(handler) {
  useEffect(() => {
    const fn = () => handler();
    window.addEventListener(PALETTE_EVENT, fn);
    return () => window.removeEventListener(PALETTE_EVENT, fn);
  }, [handler]);
}

/**
 * 全局 Ctrl/⌘+K。挂一次即可（GlobalSearch 全程挂载，就挂在它那儿）。
 * 在输入框里按也照样接管：那正是「换个东西找」的时刻。
 */
export function usePaletteHotkey() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "k" && e.key !== "K") return;
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      openPalette();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
