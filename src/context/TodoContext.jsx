import React, { useReducer, useEffect, useRef, useContext } from "react";
import { loadVersioned } from "../utils/storage";
import useUndoDelete from "../hooks/useUndoDelete";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { getTodayStr } from "../utils/time";

const CURRENT_VERSION = 1;

// Action types
const ADD = "ADD";
const TOGGLE = "TOGGLE";
const DELETE = "DELETE";
const EDIT = "EDIT";
const RESTORE = "RESTORE";
const SET = "SET";
const TOGGLE_RECURRING = "TOGGLE_RECURRING";
const UPDATE_PROPS = "UPDATE_PROPS";
const SET_ATTR_VALUE = "SET_ATTR_VALUE";

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
      const today = getTodayStr();
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
    case UPDATE_PROPS: {
      const { id, props } = action.payload;
      return state.map(t => t.id === id ? { ...t, ...props } : t);
    }
    case SET_ATTR_VALUE: {
      const { id, attrId, value } = action.payload;
      return state.map(t => {
        if (t.id !== id) return t;
        const attrs = { ...(t.attrs ?? {}) };
        const isEmpty = value === null || value === undefined ||
          (Array.isArray(value) && !value.length) ||
          value === "";
        if (isEmpty) {
          delete attrs[attrId];
        } else {
          attrs[attrId] = value;
        }
        return Object.keys(attrs).length ? { ...t, attrs } : (() => { const { attrs: _a, ...rest } = t; return rest; })();
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
    () => loadVersioned(STORAGE_KEYS.TODOS, CURRENT_VERSION),
  );

  // 保持 todosRef 指向最新 todos，供 visibilitychange 回调读取（避免 stale closure）
  const todosRef = useRef(todos);
  useEffect(() => { todosRef.current = todos; }, [todos]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.TODOS,
      JSON.stringify({ version: CURRENT_VERSION, data: todos }),
    );
  }, [todos]);

  useEffect(() => {
    // mount 时及页面重新可见时检查循环任务是否需要重置，
    // 防止 app 在后台跨过午夜后遗漏重置。
    function resetRecurring() {
      const today = getTodayStr();
      const todayDow = new Date().getDay();
      const current = todosRef.current;
      const needsReset = current.some(
        t => t.recurringDays?.includes(todayDow) && t.lastResetDate !== today
      );
      if (!needsReset) return;
      dispatch({
        type: SET,
        payload: current.map(t =>
          t.recurringDays?.includes(todayDow) && t.lastResetDate !== today
            ? { ...t, completed: false, lastResetDate: today }
            : t
        ),
      });
    }

    resetRecurring();

    const onVisible = () => {
      if (document.visibilityState === "visible") resetRecurring();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addTodo = (text, { recurringDays = null } = {}) => {
    const t = text.trim();
    if (!t) return;
    const today = getTodayStr();
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

  const updateTodoProps = (id, props) => {
    dispatch({ type: UPDATE_PROPS, payload: { id, props } });
  };

  const setTodoAttr = (id, attrId, value) => {
    dispatch({ type: SET_ATTR_VALUE, payload: { id, attrId, value } });
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
    updateTodoProps,
    setTodoAttr,
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
