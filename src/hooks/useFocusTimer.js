import { useState, useRef, useEffect } from "react";

// 封装一次专注会话的计时逻辑：累计秒数、运行/暂停、以及会话标识
// （开始时间 + sessionId，供结算成历史记录用）。
//
// 用真实时间戳差值计算秒数，而非累加 setInterval tick 次数。
// 浏览器对后台标签页会做定时器节流（Chrome 88+ 隐藏超 5 分钟后
// 约每分钟才触发一次），若靠 tick 计数则长时间切走后秒数严重偏少。
export default function useFocusTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // 本段运行开始的时间戳；暂停时置 null
  const runStartRef = useRef(null);
  // 暂停前已累计的秒数
  const accSecsRef = useRef(0);

  const sessionStartRef = useRef(null);
  const sessionIdRef = useRef(null);

  // 计算当前真实已过秒数
  const calcSeconds = () =>
    runStartRef.current == null
      ? accSecsRef.current
      : accSecsRef.current + Math.floor((Date.now() - runStartRef.current) / 1000);

  useEffect(() => {
    if (!isRunning) return undefined;
    // setInterval 仅作"刷新显示"驱动，实际秒数从时间戳差值算出
    const id = window.setInterval(() => setSeconds(calcSeconds()), 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // 开启一次新会话：记录开始时间与 sessionId 并开始计时
  const start = () => {
    accSecsRef.current = 0;
    runStartRef.current = Date.now();
    sessionStartRef.current = Date.now();
    sessionIdRef.current = crypto.randomUUID();
    setSeconds(0);
    setIsRunning(true);
  };

  const togglePause = () => {
    setIsRunning((r) => {
      if (r) {
        // 暂停：把当前已跑的秒数存入 acc，清除运行起点
        accSecsRef.current = calcSeconds();
        runStartRef.current = null;
      } else {
        // 恢复：记录新一段的起点
        runStartRef.current = Date.now();
      }
      return !r;
    });
  };

  // 重置计时（停留在同一次会话内，仅把秒数归零并暂停）
  const resetTimer = () => {
    accSecsRef.current = 0;
    runStartRef.current = null;
    sessionStartRef.current = null;
    setSeconds(0);
    setIsRunning(false);
  };

  // 结束会话：归零并清空会话标识
  const clearSession = () => {
    accSecsRef.current = 0;
    runStartRef.current = null;
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

  // 调试用：快速跳增指定秒数（不影响 sessionId / 起始时间）
  const jumpSeconds = (delta) => {
    accSecsRef.current = Math.max(0, accSecsRef.current + delta);
    setSeconds(calcSeconds());
  };

  return { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession, jumpSeconds };
}
