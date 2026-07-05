import { useCallback } from "react";

// 处理专注会话的全局停止：发币、结算所有任务、清零计时器。
export default function useSessionStop({
  seconds,
  getSession,
  sessionDistractions,
  sessionNotes,
  flushProactiveDistraction,
  addCoins,
  logEvent,
  getSnapshot,
  clearSession,
  selectedTodos,
  settleTask,
  setSessionStartTs,
  onStop,
  onSessionReward,
}) {
  const handleStop = useCallback(() => {
    const extraDistSecs = flushProactiveDistraction();

    // 先捕获计时状态再归零——确保 hasSelection effect 读到 seconds=0 不重复发币
    const finalSecs = seconds;
    const finalSession = getSession();
    const finalDistractionCount = sessionDistractions.length;
    const finalNoteCount = sessionNotes.length;
    const finalDistractionSecs =
      sessionDistractions
        .filter((d) => d.type === "proactive" && d.durationSecs != null)
        .reduce((sum, d) => sum + d.durationSecs, 0) + extraDistSecs;

    if (finalSecs > 0) addCoins(finalSecs);
    selectedTodos.forEach((t) =>
      logEvent("task_ended", { taskId: t.id, taskText: t.text })
    );
    logEvent("session_end");
    const finalEvents = getSnapshot();
    clearSession();
    selectedTodos.forEach((t) =>
      settleTask(t, "ended", {
        overrideSecs: finalSecs,
        overrideSess: finalSession,
        coinsEarned: finalSecs,
        distractionCount: finalDistractionCount,
        noteCount: finalNoteCount,
        eventsSnapshot: finalEvents,
        distractionSecs: finalDistractionSecs,
      })
    );
    setSessionStartTs(null);
    // 结算叙事卡：把本次会话事实交给上层换算收益并弹卡（时长过短不弹）。
    if (finalSecs > 0) {
      onSessionReward?.({
        durationSecs: finalSecs,
        distractionCount: finalDistractionCount,
      });
    }
    onStop?.();
  }, [
    flushProactiveDistraction, seconds, getSession,
    sessionDistractions, sessionNotes,
    addCoins, logEvent, getSnapshot, clearSession,
    selectedTodos, settleTask, setSessionStartTs, onStop, onSessionReward,
  ]);

  return { handleStop };
}
