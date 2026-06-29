import { useEffect, useRef } from "react";
import { showNotification } from "../utils/notify";

// 番茄到点触发决策（纯函数，便于单测）。
//
// 规则：
//   • 秒数尚未到目标 → 不触发，并「重新武装」（fired 复位为 false）。
//     这样新会话计时归零后会自动 re-arm，下一次到点能再触发。
//   • 已到/超过目标，且处于激活态（enabled && 运行中）、本会话还没触发过、目标有效
//     → 触发一次，并标记 fired=true（同会话内不再重复，暂停/恢复也不会重触发）。
//   • 其它情况（未激活、已触发过、目标无效）→ 不触发，沿用当前 fired。
//
// active = enabled && isRunning，由调用方合并后传入。
export function shouldFirePomodoro({ seconds, target, fired, active }) {
  if (seconds < target) return { fire: false, fired: false };
  if (!active || fired || target <= 0) return { fire: false, fired };
  return { fire: true, fired: true };
}

export default function usePomodoroNotify({ seconds, pomodoroMins, isRunning, enabled }) {
  const firedRef = useRef(false);
  const target = pomodoroMins * 60;

  useEffect(() => {
    const { fire, fired } = shouldFirePomodoro({
      seconds,
      target,
      fired: firedRef.current,
      active: enabled && isRunning,
    });
    firedRef.current = fired;
    if (!fire) return;

    showNotification("🍅 番茄完成！", {
      body: `专注满 ${pomodoroMins} 分钟啦，起来活动一下、喝口水～`,
      tag: "pomodoro-done",
    });
  }, [seconds, target, isRunning, enabled, pomodoroMins]);
}
