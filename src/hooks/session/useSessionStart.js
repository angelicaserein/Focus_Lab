import { useCallback } from "react";

// 处理专注会话的启动逻辑。
export default function useSessionStart({
  selectedTodos,
  resetEvents,
  setSessionStartTs,
  logEvent,
  start,
  onStart,
}) {
  const handleStart = useCallback(() => {
    if (!selectedTodos.length) return;
    resetEvents();
    const nowTs = Date.now();
    setSessionStartTs(nowTs);
    logEvent("session_start", {
      tasks: selectedTodos.map((t) => ({ taskId: t.id, taskText: t.text })),
    });
    start();
    onStart?.();
  }, [selectedTodos, resetEvents, setSessionStartTs, logEvent, start, onStart]);

  return { handleStart };
}
