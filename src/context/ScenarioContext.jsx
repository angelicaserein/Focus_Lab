import React, { useReducer, useEffect, useContext } from "react";
import { loadVersioned } from "../utils/storage";
import { useUndoDelete } from "../hooks/useUndoDelete";

const STORAGE_KEY = "scenarios_v1";
const CURRENT_VERSION = 1;

// Action types
const ADD = "ADD";
const DELETE = "DELETE";
const EDIT = "EDIT";
const RESTORE = "RESTORE";
const SET = "SET";

// 场景没有"完成"概念，故无 TOGGLE。
function reducer(state, action) {
  switch (action.type) {
    case ADD: {
      return [action.payload, ...state];
    }
    case DELETE: {
      return state.filter((s) => s.id !== action.payload);
    }
    case EDIT: {
      const { id, title, description } = action.payload;
      return state.map((s) =>
        s.id === id ? { ...s, title, description } : s,
      );
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

const ScenarioContext = React.createContext(null);

export function ScenarioProvider({ children }) {
  const [scenarios, dispatch] = useReducer(
    reducer,
    null,
    () => loadVersioned(STORAGE_KEY, CURRENT_VERSION),
  );

  // 选中高亮（多选）——仅本页面使用，不持久化
  const [selectedIds, setSelectedIds] = React.useState([]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: CURRENT_VERSION, data: scenarios }),
    );
  }, [scenarios]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const addScenario = (title, description = "") => {
    const t = title.trim();
    if (!t) return;
    const item = {
      id: crypto.randomUUID(),
      title: t,
      description: description.trim(),
      createdAt: Date.now(),
    };
    dispatch({ type: ADD, payload: item });
  };

  const editScenario = (id, title, description = "") => {
    const t = title.trim();
    if (!t) return;
    dispatch({
      type: EDIT,
      payload: { id, title: t, description: description.trim() },
    });
  };

  const { pendingDelete, deleteFn: deleteScenario, undoDelete } = useUndoDelete({
    items: scenarios,
    dispatch,
    onDelete: (id) => {
      const wasSelected = selectedIds.includes(id);
      if (wasSelected) setSelectedIds((prev) => prev.filter((x) => x !== id));
      return { wasSelected };
    },
    onRestore: (item, meta) => {
      if (meta?.wasSelected) setSelectedIds((prev) => [...prev, item.id]);
    },
  });

  const value = {
    scenarios,
    addScenario,
    editScenario,
    deleteScenario,
    pendingDelete,
    undoDelete,
    selectedIds,
    toggleSelect,
  };

  return (
    <ScenarioContext.Provider value={value}>
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenarios() {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenarios must be used within ScenarioProvider");
  return ctx;
}
