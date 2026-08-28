import { useCallback } from "react";
import { isRecordable } from "@/utils/records/focusRecords";

// 处理专注会话的全局停止：发币、结算所有任务、清零计时器。
// outcome 区分两条收尾路径：默认 "ended" = 只是结束（任务未必做完），
// "completed" = 「都做完了」，剩余任务一并打勾。
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
  // 参数可能是 click 事件（按钮直接绑 onStop），故只认显式的 outcome 字段
  const handleStop = useCallback((opts) => {
    const outcome = opts?.outcome === "completed" ? "completed" : "ended";
    const extraDistSecs = flushProactiveDistraction();

    // 先捕获计时状态再归零——确保 hasSelection effect 读到 seconds=0 不重复发币
    const finalSecs = seconds;
    const finalSession = getSession();
    const finalDistractionCount = sessionDistractions.length;
    const finalNoteCount = sessionNotes.length;
    // 「分心时长」＝所有离开专注的时间：主动暂停 + 切去别的软件（type: "app"）。
    // 两者对计时器的作用是一样的（都把它按停了），统计口径也该一样。
    // type: "page" 是历史遗留（翻应用内页面现已不算分心），只为旧记录仍能算进来。
    const finalDistractionSecs =
      sessionDistractions
        .filter(
          (d) =>
            (d.type === "proactive" || d.type === "app" || d.type === "page") &&
            d.durationSecs != null,
        )
        .reduce((sum, d) => sum + d.durationSecs, 0) + extraDistSecs;

    // 发币的门槛必须和记账的门槛是同一个（见 focusRecords 的 MIN_RECORD_SECS）：
    // 不足 10 秒的那一下不写记录，就也不该发币，否则金币会比全部专注记录之和还多，
    // 多出来的部分在历史里查无此事。
    if (isRecordable(finalSecs)) addCoins(finalSecs);
    selectedTodos.forEach((t) =>
      logEvent(`task_${outcome}`, { taskId: t.id, taskText: t.text })
    );
    logEvent("session_end", { allDone: outcome === "completed" });
    const finalEvents = getSnapshot();
    clearSession();
    selectedTodos.forEach((t) =>
      settleTask(t, outcome, {
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
    // completedTasks 只数「这一下真被打上勾的」：outcome 不是 completed 就一个没有，
    // 已经勾过的那些也不算（settleTask 对它们不会再 toggle 一次）。
    if (finalSecs > 0) {
      onSessionReward?.({
        durationSecs: finalSecs,
        distractionCount: finalDistractionCount,
        completedTasks:
          outcome === "completed" ? selectedTodos.filter((t) => !t.completed).length : 0,
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
