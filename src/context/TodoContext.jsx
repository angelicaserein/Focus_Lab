import React, { useReducer, useEffect, useContext } from "react";
import useLocalStorage from "../hooks/useLocalStorage";

const STORAGE_KEY = "todos_v1";
const RECORDS_KEY = "focus_records_v1";
const CURRENT_VERSION = 1;

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed?.version === CURRENT_VERSION && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    // 旧格式（裸数组）迁移
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

// Action types
const ADD = "ADD";
const TOGGLE = "TOGGLE";
const DELETE = "DELETE";
const EDIT = "EDIT";
const RESTORE = "RESTORE";
const SET = "SET";

// reducer 管理 todos 状态。未来扩展点：可以增加 MOVE, SET_PRIORITY 等动作。
function reducer(state, action) {
  switch (action.type) {
    case ADD: {
      const item = action.payload;
      return [item, ...state];
    }
    case TOGGLE: {
      return state.map((t) =>
        t.id === action.payload ? { ...t, completed: !t.completed } : t,
      );
    }
    case DELETE: {
      return state.filter((t) => t.id !== action.payload);
    }
    case EDIT: {
      const { id, text } = action.payload;
      return state.map((t) => (t.id === id ? { ...t, text } : t));
    }
    case RESTORE: {
      const { item, index } = action.payload;
      const next = state.slice();
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    }
    case SET: {
      return action.payload;
    }
    default:
      return state;
  }
}

const TodoContext = React.createContext(null);

export function TodoProvider({ children }) {
  const [focusRecords, setFocusRecords] = useLocalStorage(RECORDS_KEY, []);

  const [todos, dispatch] = useReducer(reducer, null, loadTodos);
  // 一次专注可同时选中多件任务（共用一个会话计时器）
  const [focusedTodoIds, setFocusedTodoIds] = React.useState([]);

  // 可撤销删除：暂存最近一次被删的项，供 toast 撤销
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const undoTimerRef = React.useRef(null);

  const UNDO_WINDOW_MS = 5000;

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: CURRENT_VERSION, data: todos }),
    );
  }, [todos]);

  // 便捷 action creators
  const addTodo = (text) => {
    const item = { id: crypto.randomUUID(), text, completed: false, createdAt: Date.now() };
    dispatch({ type: ADD, payload: item });
  };

  const toggleTodo = (id) => dispatch({ type: TOGGLE, payload: id });

  const editTodo = (id, text) => {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: EDIT, payload: { id, text: t } });
  };

  const deleteTodo = (id) => {
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return;
    const item = todos[index];
    const wasFocused = focusedTodoIds.includes(id);

    dispatch({ type: DELETE, payload: id });
    if (wasFocused) setFocusedTodoIds((prev) => prev.filter((x) => x !== id));

    // 暂存供撤销；若已有待撤销项则直接被新项替换（旧的落定）
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDelete({ item, index, wasFocused });
    undoTimerRef.current = setTimeout(() => {
      setPendingDelete(null);
      undoTimerRef.current = null;
    }, UNDO_WINDOW_MS);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    const { item, index, wasFocused } = pendingDelete;
    dispatch({ type: RESTORE, payload: { item, index } });
    if (wasFocused)
      setFocusedTodoIds((prev) =>
        prev.includes(item.id) ? prev : [...prev, item.id],
      );
    setPendingDelete(null);
  };

  // 加入/移出本次专注集合（供整行点击切换）
  const toggleFocusTodo = (id) =>
    setFocusedTodoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  // 仅移出（供 chip 的 × 与沉浸页移除）
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
    if (durationSecs < 10) return;
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
    todos,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    pendingDelete,
    undoDelete,
    toggleFocusTodo,
    removeFocusTodo,
    clearFocusTodos,
    focusedTodoIds,
    focusRecords,
    addFocusRecord,
    clearFocusRecords,
    dispatch,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
}
