import { useEffect } from "react";
import { isDesktop } from "@/utils/desktop/desktopBridge";

/**
 * 有正在进行、且关掉就会丢的事情时，拦一次关窗 / 刷新。
 *
 * 专注计时活在页面组件里，标签页一关那段时间就没了——在一个核心价值就是
 * 「专注被记录下来」的应用里，这是代价最高的一类可预防错误。
 *
 * 浏览器只允许弹它自己那句固定文案（自定义文案在 2016 年前后被各家去掉了），
 * 所以这里不传话术，只负责「拦一下」。
 *
 * 桌面版整条路都不走这里：主窗口点 X 只是藏起来（不丢数据），真正危险的是托盘
 * 「退出」，那条由主进程弹原生确认框拦（见 electron/main.cjs 的 requestQuit），
 * 它读的是 useDesktopFocusSync 已经在推的会话快照，不必再多一条 IPC。
 * 而且 Electron 里 beforeunload 返回值会「静默取消」关闭——真挂上去，
 * 托盘点退出会毫无反应，反倒成了个更难查的 bug。
 *
 * @param {boolean} active 现在有没有「关掉就会丢」的东西
 */
export default function useUnloadGuard(active) {
  useEffect(() => {
    if (!active || isDesktop) return undefined;

    const onBeforeUnload = (e) => {
      e.preventDefault();
      // 老浏览器要靠 returnValue 才会弹（Chrome 119+ 只看 preventDefault）
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);
}
