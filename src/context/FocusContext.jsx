import React, { useContext } from "react";
import useLocalStorage from "../hooks/useLocalStorage";

// FocusContext 管理「专注」相关状态，与具体的 todo 数据解耦：
//   1. 本次专注选择 —— 只存 todo id 的集合（不依赖 todos 本身）。
//   2. 专注记录 —— 已结算的历史会话，持久化到 localStorage。
// 因为这里只存 id，所以它可以作为 TodoProvider 的外层，
// 由 TodoContext 在删除/撤销时反向调用本 context 的方法。

const RECORDS_KEY = "focus_records_v1";
const MIN_RECORD_SECS = 10; // 过短的专注不记账

const FocusContext = React.createContext(null);

export function FocusProvider({ children }) {
  // 内部用 Set 存储，O(1) 查找；对外暴露数组保持向后兼容
  const [focusedSet, setFocusedSet] = React.useState(() => new Set());
  const [focusRecords, setFocusRecords] = useLocalStorage(RECORDS_KEY, []);

  // 对外暴露的数组，仅当 Set 变化时重新计算
  const focusedTodoIds = React.useMemo(() => Array.from(focusedSet), [focusedSet]);

  // O(1) 查找，供 TodoItem 直接使用
  const isFocused = (id) => focusedSet.has(id);

  const toggleFocusTodo = (id) =>
    setFocusedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // 仅加入（供撤销删除时恢复选中状态）；已存在则不触发重渲染
  const addFocusTodo = (id) =>
    setFocusedSet((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  // 仅移出（供 chip 的 ×、沉浸页移除、删除任务时联动）；不存在则不触发重渲染
  const removeFocusTodo = (id) =>
    setFocusedSet((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const clearFocusTodos = () => setFocusedSet(new Set());

  const addFocusRecord = ({
    taskId,
    taskText,
    durationSecs,
    startedAt,
    sessionId,
    outcome,
    scenarioId,
    scenarioTitle,
    coinsEarned,
    distractionCount,
    noteCount,
    events,
  }) => {
    if (durationSecs < MIN_RECORD_SECS) return;
    const record = {
      id: crypto.randomUUID(),
      taskId,
      taskText,
      durationSecs,
      startedAt,
      endedAt: Date.now(),
      sessionId,
      outcome,
      ...(scenarioId ? { scenarioId, scenarioTitle } : {}),
      ...(coinsEarned !== undefined ? { coinsEarned } : {}),
      ...(distractionCount !== undefined ? { distractionCount } : {}),
      ...(noteCount !== undefined ? { noteCount } : {}),
      ...(events?.length ? { events } : {}),
    };
    setFocusRecords((prev) => [record, ...prev]);
  };

  const clearFocusRecords = () => setFocusRecords([]);

  const value = {
    focusedTodoIds,
    isFocused,
    toggleFocusTodo,
    addFocusTodo,
    removeFocusTodo,
    clearFocusTodos,
    focusRecords,
    addFocusRecord,
    clearFocusRecords,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}
