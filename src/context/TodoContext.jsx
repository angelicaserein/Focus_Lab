import React, { useReducer, useEffect, useContext } from "react";
import { useFocus } from "./FocusContext";

const STORAGE_KEY = "todos_v1";
const CURRENT_VERSION = 1;
const UNDO_WINDOW_MS = 5000;

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
  // 专注选择由外层 FocusProvider 提供；删除/撤销时与之联动
  const { focusedTodoIds, removeFocusTodo, addFocusTodo } = useFocus();

  const [todos, dispatch] = useReducer(reducer, null, loadTodos);

  // 可撤销删除：暂存最近一次被删的项，供 toast 撤销
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const undoTimerRef = React.useRef(null);

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
    if (wasFocused) removeFocusTodo(id);

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
    if (wasFocused) addFocusTodo(item.id);
    setPendingDelete(null);
  };

  const value = {
    todos,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    pendingDelete,
    undoDelete,
    dispatch,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
}
