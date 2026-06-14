import { useState, useRef, useEffect } from "react";

// 封装一次专注会话的计时逻辑：累计秒数、运行/暂停、以及会话标识
// （开始时间 + sessionId，供结算成历史记录用）。
// 把 seconds/isRunning 与 interval 收敛在一处，调用方只用语义化方法。
export default function useFocusTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const sessionStartRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = window.setInterval(() => setSeconds((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  // 开启一次新会话：记录开始时间与 sessionId 并开始计时
  const start = () => {
    sessionStartRef.current = Date.now();
    sessionIdRef.current = crypto.randomUUID();
    setIsRunning(true);
  };

  const togglePause = () => setIsRunning((r) => !r);

  // 重置计时（停留在同一次会话内，仅把秒数归零并暂停）
  const resetTimer = () => {
    setSeconds(0);
    setIsRunning(false);
    sessionStartRef.current = null;
  };

  // 结束会话：归零并清空会话标识
  const clearSession = () => {
    setSeconds(0);
    setIsRunning(false);
    sessionStartRef.current = null;
    sessionIdRef.current = null;
  };

  // 结算时读取当前会话信息（ref 不触发渲染，按调用时刻取值）
  const getSession = () => ({
    startedAt: sessionStartRef.current,
    sessionId: sessionIdRef.current,
  });

  return { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession };
}
