import { useState, useRef, useEffect, useCallback } from "react";

// 由「暂停前累计秒数 + 本段运行起点」算出真实已过秒数（纯函数，便于单测）。
// runStart 为 null 表示当前处于暂停态，直接返回累计值。
export function calcSeconds(accSecs, runStart, now = Date.now()) {
  return runStart == null ? accSecs : accSecs + Math.floor((now - runStart) / 1000);
}

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

  // 读取当前真实已过秒数（依赖 ref，引用稳定）
  const readSeconds = useCallback(
    () => calcSeconds(accSecsRef.current, runStartRef.current),
    [],
  );

  useEffect(() => {
    if (!isRunning) return undefined;
    // setInterval 仅作"刷新显示"驱动，实际秒数从时间戳差值算出
    const id = window.setInterval(() => setSeconds(readSeconds()), 500);
    return () => window.clearInterval(id);
  }, [isRunning, readSeconds]);

  // 开启一次新会话：记录开始时间与 sessionId 并开始计时
  const start = useCallback(() => {
    accSecsRef.current = 0;
    runStartRef.current = Date.now();
    sessionStartRef.current = Date.now();
    sessionIdRef.current = crypto.randomUUID();
    setSeconds(0);
    setIsRunning(true);
  }, []);

  const togglePause = useCallback(() => {
    setIsRunning((r) => {
      if (r) {
        // 暂停：把当前已跑的秒数存入 acc，清除运行起点
        accSecsRef.current = readSeconds();
        runStartRef.current = null;
      } else {
        // 恢复：记录新一段的起点
        runStartRef.current = Date.now();
      }
      return !r;
    });
  }, [readSeconds]);

  // 重置计时（停留在同一次会话内，仅把秒数归零并暂停）。
  //
  // 刻意保留 sessionId：「重置」与「结束专注」是两个按钮，后者才负责结束会话
  // （走 clearSession 清掉 sessionId）。故重置的语义是「这次没完，只是计时重来」，
  // 重置前后结算的任务在 History 里仍归为同一张「一次专注」卡。
  //
  // 但 sessionStartRef 要清：秒数已从 0 重跑，旧起点不再代表这段的开始。
  // 清成 null 后 buildFocusRecord 会走 `startedAt ?? Date.now() - durationSecs*1000`
  // 回退，正好把起点算到重置那一刻。
  // 注意别和 FocusPage 的 sessionStartTs（筛本次随记/分心用）混为一谈：那个由
  // handleStart/handleStop 管，重置不该动它——重置不结束会话，随记自然要留着。
  const resetTimer = useCallback(() => {
    accSecsRef.current = 0;
    runStartRef.current = null;
    sessionStartRef.current = null;
    setSeconds(0);
    setIsRunning(false);
  }, []);

  // 结束会话：归零并清空会话标识
  const clearSession = useCallback(() => {
    accSecsRef.current = 0;
    runStartRef.current = null;
    setSeconds(0);
    setIsRunning(false);
    sessionStartRef.current = null;
    sessionIdRef.current = null;
  }, []);

  // 结算时读取当前会话信息（ref 不触发渲染，按调用时刻取值）
  const getSession = useCallback(
    () => ({
      startedAt: sessionStartRef.current,
      sessionId: sessionIdRef.current,
    }),
    [],
  );

  // 调试用：快速跳增指定秒数（不影响 sessionId / 起始时间）
  const jumpSeconds = useCallback((delta) => {
    accSecsRef.current = Math.max(0, accSecsRef.current + delta);
    setSeconds(readSeconds());
  }, [readSeconds]);

  return { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession, jumpSeconds };
}
