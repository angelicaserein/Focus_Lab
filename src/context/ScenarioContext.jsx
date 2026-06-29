import React, { useReducer, useState, useContext, useCallback } from "react";
import { loadVersioned, WRAPPER_VERSION } from "../utils/storage";
import useUndoDelete from "../hooks/useUndoDelete";
import usePersistedWrite from "../hooks/usePersistedWrite";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { DEFAULT_SCENARIO_SETTINGS } from "../utils/scenarioConstants";

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

// 从 localStorage 读取「当前情景」id（标量，非数组），兼容旧裸格式与 versioned 包装。
function loadActiveScenarioId() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SCENARIO);
    if (raw) {
      const parsed = JSON.parse(raw);
      const id = parsed?.data ?? parsed;
      if (typeof id === "string") return id;
    }
  } catch { /* ignore */ }
  return null;
}

// activeScenarioId 是全局唯一的「当前情景」（单选，持久化）：
//   · 情景页点选 = 切换当前情景
//   · 待办页按其 settings.taskTypes 过滤任务
//   · 专注页会话归属于它
// 情景与待办是多对多松耦合（经由 taskType tag 匹配），情景并不"拥有"待办。
export function ScenarioProvider({ children }) {
  const [scenarios, dispatch] = useReducer(
    reducer,
    null,
    () => loadVersioned(STORAGE_KEYS.SCENARIOS, WRAPPER_VERSION),
  );

  const [activeScenarioId, setActiveScenarioId] = useState(loadActiveScenarioId);

  usePersistedWrite(STORAGE_KEYS.SCENARIOS, scenarios);
  usePersistedWrite(STORAGE_KEYS.ACTIVE_SCENARIO, activeScenarioId);

  // 已被删除的情景 id 不应再是「当前情景」；派生时校验，避免悬空引用。
  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) ?? null;

  // 直接设置当前情景（传 null = 无情景）。"再点一次退出"之类的切换逻辑由调用方处理。
  const setActiveScenario = useCallback((id) => setActiveScenarioId(id ?? null), []);
  const clearActiveScenario = useCallback(() => setActiveScenarioId(null), []);

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
      settings: { ...DEFAULT_SCENARIO_SETTINGS },
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
      const wasActive = activeScenarioId === id;
      if (wasActive) setActiveScenarioId(null);
      return { wasActive };
    },
    onRestore: (item, meta) => {
      if (meta?.wasActive) setActiveScenarioId(item.id);
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
    activeScenarioId,
    activeScenario,
    setActiveScenario,
    clearActiveScenario,
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
