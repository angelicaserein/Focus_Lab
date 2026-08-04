import { useEffect, useRef } from "react";
import desktop, { isDesktop } from "@/utils/desktop/desktopBridge";

// Focus 页专用：把计时状态推给桌宠，并接住桌宠发来的计时指令。
//
// 为什么非得挂在 Focus 页而不是全局：一次专注的状态（useFocusTimer）活在
// FocusPage 组件里，页面一卸载会话就没了。所以桌宠的「开始专注」在主进程侧
// 会先把主窗口切到 /focus（见 main.cjs 的 desktop:command 处理），
// 等这个 hook 挂载上来才有人接得住这条指令。
//
// 参数里的回调都是事件型的（每次渲染重建），统一走 ref 取最新值，
// 这样订阅只建一次、不会因为回调换了引用就反复解绑重绑。
export default function useDesktopFocusSync({
  seconds, isRunning, isImmersive, targetMins, timerMode,
  hasSelection, onStart, onTogglePause, onStop,
}) {
  const actions = useRef({});
  actions.current = { onStart, onTogglePause, onStop, hasSelection, isRunning };

  // 已执行过的指令 id。同一条指令可能既被实时推送收到、又被挂载时的认领拿到
  // （见 main.cjs 的 pendingCommand），靠这个集合保证只执行一次。
  const handledIds = useRef(new Set());

  useEffect(() => {
    if (!isDesktop) return undefined;

    const run = (cmd) => {
      if (!cmd) return;
      if (cmd.id) {
        if (handledIds.current.has(cmd.id)) return;
        handledIds.current.add(cmd.id);
      }
      const a = actions.current;
      switch (cmd.type) {
        case "start":
          // 主进程已经把窗口切到 /focus 了。没选任务就什么都不做——
          // 正常情况下走不到这儿：桌宠面板里没勾任务时「开始专注」是禁用的。
          if (!a.isRunning && a.hasSelection) a.onStart();
          break;
        case "toggle-pause":
          a.onTogglePause();
          break;
        case "stop":
          a.onStop();
          break;
        default:
          break;
      }
    };

    // 先认领：桌宠点「开始专注」时本页面还没挂载完（/focus 是懒加载路由），
    // 那条指令此刻正躺在主进程里等人来取。
    let alive = true;
    desktop.claimCommand().then((cmd) => { if (alive) run(cmd); }).catch(() => {});

    const off = desktop.onCommand(run);
    return () => { alive = false; off(); };
  }, []);

  // 计时每 500ms 刷新一次，但桌宠只按整秒显示，秒数没变就别过 IPC。
  const lastKey = useRef("");
  useEffect(() => {
    if (!isDesktop) return;
    const key = [seconds, isRunning, isImmersive, targetMins, timerMode, hasSelection].join("|");
    if (key === lastKey.current) return;
    lastKey.current = key;
    desktop.publishState({
      focus: { seconds, isRunning, isImmersive, targetMins, timerMode, hasSelection },
    });
  }, [seconds, isRunning, isImmersive, targetMins, timerMode, hasSelection]);

  // 离开专注页：明确告诉桌宠「没有会话了」，让它退回待机的空瓶，
  // 而不是永远停在最后一帧的进度上。
  useEffect(() => {
    if (!isDesktop) return undefined;
    return () => desktop.publishState({ focus: null });
  }, []);
}
