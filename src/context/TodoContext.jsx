import React, { useReducer, useEffect, useContext } from "react";
import { loadVersioned } from "../utils/storage";
import { useUndoDelete } from "../hooks/useUndoDelete";

const STORAGE_KEY = "todos_v1";
const CURRENT_VERSION = 1;

// Action types
const ADD = "ADD";
const TOGGLE = "TOGGLE";
const DELETE = "DELETE";
const EDIT = "EDIT";
const RESTORE = "RESTORE";
const SET = "SET";
const TOGGLE_RECURRING = "TOGGLE_RECURRING";
const EDIT_TAGS = "EDIT_TAGS";

function reducer(state, action) {
  switch (action.type) {
    case ADD: {
      return [action.payload, ...state];
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
    case TOGGLE_RECURRING: {
      const today = new Date().toISOString().split('T')[0];
      const { id, days } = action.payload;
      return state.map(t => {
        if (t.id !== id) return t;
        if (!days?.length) {
          const { recurringDays, lastResetDate, ...rest } = t;
          return rest;
        }
        return { ...t, recurringDays: days, lastResetDate: today };
      });
    }
    case EDIT_TAGS: {
      const { id, tags } = action.payload;
      return state.map(t => {
        if (t.id !== id) return t;
        if (!tags?.length) {
          const { tags: _tags, ...rest } = t;
          return rest;
        }
        return { ...t, tags };
      });
    }
    default:
      return state;
  }
}

const TodoContext = React.createContext(null);

export function TodoProvider({ children }) {
  const [todos, dispatch] = useReducer(
    reducer,
    null,
    () => loadVersioned(STORAGE_KEY, CURRENT_VERSION),
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: CURRENT_VERSION, data: todos }),
    );
  }, [todos]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayDow = new Date().getDay();
    const needsReset = todos.some(
      t => t.recurringDays?.includes(todayDow) && t.lastResetDate !== today
    );
    if (!needsReset) return;
    dispatch({
      type: SET,
      payload: todos.map(t =>
        t.recurringDays?.includes(todayDow) && t.lastResetDate !== today
          ? { ...t, completed: false, lastResetDate: today }
          : t
      ),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addTodo = (text, { recurringDays = null } = {}) => {
    const t = text.trim();
    if (!t) return;
    const today = new Date().toISOString().split('T')[0];
    const item = {
      id: crypto.randomUUID(),
      text: t,
      completed: false,
      createdAt: Date.now(),
      ...(recurringDays?.length && { recurringDays, lastResetDate: today }),
    };
    dispatch({ type: ADD, payload: item });
    return item;
  };

  const toggleTodo = (id) => dispatch({ type: TOGGLE, payload: id });

  const toggleRecurring = (id, days) => dispatch({ type: TOGGLE_RECURRING, payload: { id, days } });

  const editTodo = (id, text) => {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: EDIT, payload: { id, text: t } });
  };

  const editTodoTags = (id, tags) => {
    dispatch({ type: EDIT_TAGS, payload: { id, tags } });
  };

  const { pendingDelete, deleteFn: deleteTodo, undoDelete } = useUndoDelete({
    items: todos,
    dispatch,
  });

  const value = {
    todos,
    addTodo,
    toggleTodo,
    toggleRecurring,
    editTodo,
    editTodoTags,
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
