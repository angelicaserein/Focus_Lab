import { useState, useEffect, useCallback } from "react";

// 管理沉浸页的任务选择操作：加入、新建并加入、替换。
// onAutoStart / hasSelection：抽卡后等 hasSelection 变 true 再自动触发开始。
export default function useFocusSelection({
  todos,
  addTodo,
  addFocusTodo,
  removeFocusTodo,
  logEvent,
  onAutoStart,
  hasSelection,
}) {
  const [pendingAutoStart, setPendingAutoStart] = useState(false);

  useEffect(() => {
    if (pendingAutoStart && hasSelection) {
      onAutoStart?.();
      setPendingAutoStart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoStart, hasSelection]);

  const addToFocus = useCallback((id) => {
    addFocusTodo(id);
    const todo = todos.find((t) => t.id === id);
    logEvent("task_added", { taskId: id, taskText: todo?.text });
  }, [todos, addFocusTodo, logEvent]);

  const createAndFocus = useCallback((text) => {
    const t = text.trim();
    if (!t) return;
    const item = addTodo(t);
    if (item) {
      addFocusTodo(item.id);
      logEvent("task_added", { taskId: item.id, taskText: item.text });
    }
  }, [addTodo, addFocusTodo, logEvent]);

  const replaceFocus = useCallback((oldId, newId) => {
    const oldTodo = todos.find((t) => t.id === oldId);
    const newTodo = todos.find((t) => t.id === newId);
    // React 18 批量提交，两次 setState 同步，集合不会瞬空触发退出
    removeFocusTodo(oldId);
    addFocusTodo(newId);
    logEvent("task_replaced", {
      oldTaskId: oldId,
      oldTaskText: oldTodo?.text,
      newTaskId: newId,
      newTaskText: newTodo?.text,
    });
  }, [todos, removeFocusTodo, addFocusTodo, logEvent]);

  // 抽卡选中：addFocusTodo 是异步 setState，需等 hasSelection 变 true 再调 onAutoStart
  const handleDrawerSelect = useCallback((todo) => {
    addFocusTodo(todo.id);
    setPendingAutoStart(true);
  }, [addFocusTodo]);

  return { addToFocus, createAndFocus, replaceFocus, handleDrawerSelect };
}
