import React, { useReducer, useEffect, useContext } from "react";

const STORAGE_KEY = "scenarios_v1";
const CURRENT_VERSION = 1;
const UNDO_WINDOW_MS = 5000;

function loadScenarios() {
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
const DELETE = "DELETE";
const EDIT = "EDIT";
const RESTORE = "RESTORE";
const SET = "SET";

// reducer 管理 scenarios 状态。场景没有“完成”概念，故无 TOGGLE。
function reducer(state, action) {
  switch (action.type) {
    case ADD: {
      const item = action.payload;
      return [item, ...state];
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
  const [scenarios, dispatch] = useReducer(reducer, null, loadScenarios);

  // 选中高亮（多选）——仅本页面使用，不持久化
  const [selectedIds, setSelectedIds] = React.useState([]);

  // 可撤销删除：暂存最近一次被删的项，供 toast 撤销
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const undoTimerRef = React.useRef(null);

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

  // 便捷 action creators
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

  const deleteScenario = (id) => {
    const index = scenarios.findIndex((s) => s.id === id);
    if (index === -1) return;
    const item = scenarios[index];
    const wasSelected = selectedIds.includes(id);

    dispatch({ type: DELETE, payload: id });
    if (wasSelected) setSelectedIds((prev) => prev.filter((x) => x !== id));

    // 暂存供撤销；若已有待撤销项则直接被新项替换（旧的落定）
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDelete({ item, index, wasSelected });
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
    const { item, index, wasSelected } = pendingDelete;
    dispatch({ type: RESTORE, payload: { item, index } });
    if (wasSelected) setSelectedIds((prev) => [...prev, item.id]);
    setPendingDelete(null);
  };

  const value = {
    scenarios,
    addScenario,
    editScenario,
    deleteScenario,
    pendingDelete,
    undoDelete,
    selectedIds,
    toggleSelect,
    dispatch,
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
