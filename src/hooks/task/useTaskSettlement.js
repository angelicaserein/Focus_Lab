import { useCallback } from "react";
import { buildFocusRecord } from "@/utils/records/focusRecords";

// 结算单个任务：写 focus record + 打勾（如需）+ 移出专注集合。
// overrideSecs / overrideSess 由 handleStop 传入归零前的快照，
// 防止 clearSession 先于本函数执行时读到 seconds=0 / sessionId=null。
export default function useTaskSettlement({
  seconds,
  getSession,
  logEvent,
  addFocusRecord,
  selectedScenarioId,
  scenarioTitle,
  activeFlaskId,
  getSnapshot,
  toggleTodo,
  removeFocusTodo,
}) {
  const settleTask = useCallback((
    todo,
    outcome,
    {
      overrideSecs = seconds,
      overrideSess = getSession(),
      // 缺省即「此刻的秒数」。金币按 1 秒 1 枚发放，而「逐一勾完」这条路上
      // 发币发生在收尾（见 useAutoStopOnEmpty），按最终秒数发一次；每条记录
      // 记下自己结算那一刻的秒数，读的一侧取 max 就正好是真实到手的数目。
      // 以前这里留空，那条路上的记录 coinsEarned 全是 undefined，日历上显示 0。
      coinsEarned = overrideSecs,
      distractionCount,
      noteCount,
      eventsSnapshot,
      distractionSecs,
    } = {},
  ) => {
    if (!eventsSnapshot) {
      logEvent(`task_${outcome}`, { taskId: todo.id, taskText: todo.text });
    }
    addFocusRecord(buildFocusRecord(todo, outcome, {
      durationSecs: overrideSecs,
      startedAt: overrideSess.startedAt,
      sessionId: overrideSess.sessionId,
      scenarioId: selectedScenarioId,
      scenarioTitle,
      flaskId: activeFlaskId,
      coinsEarned,
      distractionCount,
      distractionSecs,
      noteCount,
      events: eventsSnapshot ?? getSnapshot(),
    }));
    // log:false —— 这次完成已经记在专注记录里，不必在时间轴上再多一个使用记录点
    if (outcome === "completed" && !todo.completed) toggleTodo(todo.id, { log: false });
    removeFocusTodo(todo.id);
  }, [seconds, getSession, logEvent, addFocusRecord, selectedScenarioId, scenarioTitle, activeFlaskId, getSnapshot, toggleTodo, removeFocusTodo]);

  return { settleTask };
}
