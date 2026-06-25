import React, { useContext } from "react";
import { useFocus } from "./FocusContext";
import useUndoableList from "../hooks/useUndoableList";

const STORAGE_KEY = "todos_v1";
const CURRENT_VERSION = 1;

const TodoContext = React.createContext(null);

export function TodoProvider({ children }) {
  // 专注选择由外层 FocusProvider 提供；删除/撤销时与之联动
  const { focusedTodoIds, removeFocusTodo, addFocusTodo } = useFocus();

  const {
    items: todos,
    add,
    patch,
    remove,
    undoDelete,
    pendingDelete,
  } = useUndoableList({
    storageKey: STORAGE_KEY,
    version: CURRENT_VERSION,
    // 删除时若该任务正在本次专注，则一并移出；撤销时恢复其专注选中状态
    onRemove: (item, meta) => {
      if (meta.wasFocused) removeFocusTodo(item.id);
    },
    onRestore: (item, meta) => {
      if (meta.wasFocused) addFocusTodo(item.id);
    },
  });

  const addTodo = (text) => {
    const item = { id: crypto.randomUUID(), text, completed: false, createdAt: Date.now() };
    add(item);
    return item;
  };

  const toggleTodo = (id) => {
    const t = todos.find((x) => x.id === id);
    if (!t) return;
    patch(id, { completed: !t.completed });
  };

  const editTodo = (id, text) => {
    const t = text.trim();
    if (!t) return;
    patch(id, { text: t });
  };

  const deleteTodo = (id) => {
    remove(id, { wasFocused: focusedTodoIds.includes(id) });
  };

  const value = {
    todos,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    pendingDelete,
    undoDelete,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
}
