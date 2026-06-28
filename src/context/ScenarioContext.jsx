import React, { useReducer, useContext } from "react";
import { loadVersioned, WRAPPER_VERSION } from "../utils/storage";
import useUndoDelete from "../hooks/useUndoDelete";
import usePersistedWrite from "../hooks/usePersistedWrite";
import useScenarioSelection from "../hooks/useScenarioSelection";
import { STORAGE_KEYS } from "../utils/storageKeys";

// Action types
const ADD = "ADD";
const DELETE = "DELETE";
const EDIT = "EDIT";
const RESTORE = "RESTORE";
const SET = "SET";
const UPDATE_SETTINGS = "UPDATE_SETTINGS";

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
    case UPDATE_SETTINGS: {
      const { id, settings } = action.payload;
      return state.map((s) => (s.id === id ? { ...s, settings } : s));
    }
    default:
      return state;
  }
}

const ScenarioContext = React.createContext(null);

// selectedIds（场景多选）放在 Context 而非 page 级，是因为 Scenario 页选中后
// 需要在 Focus 页中过滤可用场景，两者跨路由共享同一选中状态。
export function ScenarioProvider({ children }) {
  const [scenarios, dispatch] = useReducer(
    reducer,
    null,
    () => loadVersioned(STORAGE_KEYS.SCENARIOS, WRAPPER_VERSION),
  );

  usePersistedWrite(STORAGE_KEYS.SCENARIOS, scenarios);

  const { selectedIds, toggleSelect, clearSelection, removeFromSelection, restoreToSelection } =
    useScenarioSelection();

  const updateScenarioSettings = (id, settings) => {
    dispatch({ type: UPDATE_SETTINGS, payload: { id, settings } });
  };

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
      if (wasSelected) removeFromSelection(id);
      return { wasSelected };
    },
    onRestore: (item, meta) => {
      if (meta?.wasSelected) restoreToSelection(item.id);
    },
  });

  const value = {
    scenarios,
    addScenario,
    editScenario,
    deleteScenario,
    updateScenarioSettings,
    pendingDelete,
    undoDelete,
    selectedIds,
    toggleSelect,
    clearSelection,
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
