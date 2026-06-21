import React, { useReducer, useEffect, useContext } from "react";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { TASK_ATTR_DEFAULTS } from "../utils/taskAttrDefaults";

const ADD_ATTR     = "ADD_ATTR";
const UPDATE_ATTR  = "UPDATE_ATTR";
const DELETE_ATTR  = "DELETE_ATTR";
const REORDER_ATTRS = "REORDER_ATTRS";
const SET_ATTRS    = "SET_ATTRS";

function reducer(state, action) {
  switch (action.type) {
    case ADD_ATTR: {
      return [...state, action.payload];
    }
    case UPDATE_ATTR: {
      const { id, patch } = action.payload;
      return state.map(a => a.id === id ? { ...a, ...patch } : a);
    }
    case DELETE_ATTR: {
      const attr = state.find(a => a.id === action.payload);
      if (attr?.system) return state;
      return state.filter(a => a.id !== action.payload);
    }
    case REORDER_ATTRS: {
      const orderedIds = action.payload;
      const map = Object.fromEntries(state.map(a => [a.id, a]));
      return orderedIds
        .filter(id => map[id])
        .map((id, i) => ({ ...map[id], order: i }));
    }
    case SET_ATTRS: {
      return action.payload;
    }
    default:
      return state;
  }
}

function loadAttrs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASK_ATTRS);
    if (!raw) return TASK_ATTR_DEFAULTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : TASK_ATTR_DEFAULTS;
  } catch {
    return TASK_ATTR_DEFAULTS;
  }
}

const TaskAttrContext = React.createContext(null);

export function TaskAttrProvider({ children }) {
  const [taskAttrs, dispatch] = useReducer(reducer, null, loadAttrs);

  // 直接写 localStorage（不用 useLocalStorage 的去抖），因为属性变更仅在 Settings 页手动触发，
  // 频率极低，需要即时持久化而不是延迟 300ms。
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASK_ATTRS, JSON.stringify(taskAttrs));
  }, [taskAttrs]);

  const addTaskAttr = (name, type, options) => {
    const maxOrder = taskAttrs.reduce((m, a) => Math.max(m, a.order), -1);
    dispatch({
      type: ADD_ATTR,
      payload: {
        id: crypto.randomUUID(),
        name,
        type,
        system: false,
        visible: true,
        order: maxOrder + 1,
        ...(options ? { options } : {}),
      },
    });
  };

  const updateTaskAttr = (id, patch) =>
    dispatch({ type: UPDATE_ATTR, payload: { id, patch } });

  const deleteTaskAttr = (id) =>
    dispatch({ type: DELETE_ATTR, payload: id });

  const reorderTaskAttrs = (orderedIds) =>
    dispatch({ type: REORDER_ATTRS, payload: orderedIds });

  const value = { taskAttrs, addTaskAttr, updateTaskAttr, deleteTaskAttr, reorderTaskAttrs };

  return <TaskAttrContext.Provider value={value}>{children}</TaskAttrContext.Provider>;
}

export function useTaskAttrs() {
  const ctx = useContext(TaskAttrContext);
  if (!ctx) throw new Error("useTaskAttrs must be used within TaskAttrProvider");
  return ctx;
}
