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
  // 一次专注可同时选中多件任务（共用一个会话计时器）
  const [focusedTodoIds, setFocusedTodoIds] = React.useState([]);
  const [focusRecords, setFocusRecords] = useLocalStorage(RECORDS_KEY, []);

  // 加入/移出本次专注集合（供整行点击切换）
  const toggleFocusTodo = (id) =>
    setFocusedTodoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  // 仅加入（供撤销删除时恢复选中状态）
  const addFocusTodo = (id) =>
    setFocusedTodoIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  // 仅移出（供 chip 的 ×、沉浸页移除、删除任务时联动）
  const removeFocusTodo = (id) =>
    setFocusedTodoIds((prev) => prev.filter((x) => x !== id));
  const clearFocusTodos = () => setFocusedTodoIds([]);

  const addFocusRecord = ({
    taskId,
    taskText,
    durationSecs,
    startedAt,
    sessionId,
    outcome,
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
    };
    setFocusRecords((prev) => [record, ...prev]);
  };

  const clearFocusRecords = () => setFocusRecords([]);

  const value = {
    focusedTodoIds,
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
