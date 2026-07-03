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
      coinsEarned,
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
      coinsEarned,
      distractionCount,
      distractionSecs,
      noteCount,
      events: eventsSnapshot ?? getSnapshot(),
    }));
    if (outcome === "completed" && !todo.completed) toggleTodo(todo.id);
    removeFocusTodo(todo.id);
  }, [seconds, getSession, logEvent, addFocusRecord, selectedScenarioId, scenarioTitle, getSnapshot, toggleTodo, removeFocusTodo]);

  return { settleTask };
}
