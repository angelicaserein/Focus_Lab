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
const SET = "SET";

// reducer 管理 todos 状态。未来扩展点：可以增加 EDIT, MOVE, SET_PRIORITY 等动作。
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
  const [focusedTodoId, setFocusedTodoId] = React.useState(null);

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
  const deleteTodo = (id) => {
    dispatch({ type: DELETE, payload: id });
    if (focusedTodoId === id) {
      setFocusedTodoId(null);
    }
  };

  const setFocusTodo = (id) => setFocusedTodoId(id);
  const clearFocusTodo = () => setFocusedTodoId(null);

  const addFocusRecord = ({ taskId, taskText, durationSecs, startedAt }) => {
    if (durationSecs < 10) return;
    const record = {
      id: crypto.randomUUID(),
      taskId,
      taskText,
      durationSecs,
      startedAt,
      endedAt: Date.now(),
    };
    setFocusRecords((prev) => [record, ...prev]);
  };

  const clearFocusRecords = () => setFocusRecords([]);

  const value = {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFocusTodo,
    clearFocusTodo,
    focusedTodoId,
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
