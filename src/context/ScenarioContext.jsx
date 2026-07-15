import React, { useReducer, useState, useContext, useCallback } from "react";
import {
  loadVersioned,
  loadVersionedScalar,
  WRAPPER_VERSION,
} from "@/utils/storage/storage";
import useUndoDelete from "@/hooks/common/useUndoDelete";
import usePersistedWrite from "@/hooks/common/usePersistedWrite";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import {
  DEFAULT_SCENARIO_SETTINGS,
  DEFAULT_SCENARIO_OPTIONS,
} from "@/utils/scenario/scenarioConstants";

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

// 读取可自定义选项表，补齐缺失的 kind（容忍旧/残缺数据），并保证每项形状合法。
// 注意：scenarioOptions 是对象（非数组），不能用只认数组的 loadVersioned，需手动拆包。
function loadScenarioOptions() {
  // 兼容裸对象与 { version, data } 包装；解包失败/无值时回退 null。
  const stored = loadVersionedScalar(STORAGE_KEYS.SCENARIO_OPTIONS);
  const out = {};
  for (const kind of Object.keys(DEFAULT_SCENARIO_OPTIONS)) {
    const list = Array.isArray(stored?.[kind]) ? stored[kind] : DEFAULT_SCENARIO_OPTIONS[kind];
    out[kind] = list
      .filter((o) => o && typeof o.id === "string")
      .map((o) => ({ id: o.id, label: o.label ?? "", ...(o.icon ? { icon: o.icon } : {}) }));
  }
  return out;
}

// 从 localStorage 读取「当前情景」id（标量，非数组），兼容旧裸格式与 versioned 包装。
function loadActiveScenarioId() {
  return loadVersionedScalar(
    STORAGE_KEYS.ACTIVE_SCENARIO,
    (id) => typeof id === "string",
    null,
  );
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

  // 可自定义选项表（设备 / 交流规则）。全局共享：在任一情境里编辑都影响全部情境。
  const [scenarioOptions, setScenarioOptions] = useState(loadScenarioOptions);

  usePersistedWrite(STORAGE_KEYS.SCENARIOS, scenarios);
  usePersistedWrite(STORAGE_KEYS.ACTIVE_SCENARIO, activeScenarioId);
  usePersistedWrite(STORAGE_KEYS.SCENARIO_OPTIONS, scenarioOptions);

  // 已被删除的情景 id 不应再是「当前情景」；派生时校验，避免悬空引用。
  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) ?? null;

  // 直接设置当前情景（传 null = 无情景）。"再点一次退出"之类的切换逻辑由调用方处理。
  const setActiveScenario = useCallback((id) => setActiveScenarioId(id ?? null), []);
  const clearActiveScenario = useCallback(() => setActiveScenarioId(null), []);

  const updateScenarioSettings = (id, settings) => {
    dispatch({ type: UPDATE_SETTINGS, payload: { id, settings } });
  };

  // ---- 可自定义选项表 CRUD（kind: "devices" | "communication"）----
  const addScenarioOption = useCallback((kind, { label, icon } = {}) => {
    const text = (label ?? "").trim();
    if (!text) return;
    setScenarioOptions((prev) => ({
      ...prev,
      [kind]: [
        ...(prev[kind] ?? []),
        { id: crypto.randomUUID(), label: text, ...(icon ? { icon } : {}) },
      ],
    }));
  }, []);

  // 编辑期间不 trim（否则会吞掉用户正在输入的尾随空格），原样存储。
  const updateScenarioOption = useCallback((kind, id, patch) => {
    setScenarioOptions((prev) => ({
      ...prev,
      [kind]: (prev[kind] ?? []).map((o) => {
        if (o.id !== id) return o;
        const icon = patch.icon ?? o.icon;
        return {
          id: o.id,
          label: patch.label ?? o.label,
          ...(icon ? { icon } : {}),
        };
      }),
    }));
  }, []);

  const removeScenarioOption = useCallback((kind, id) => {
    setScenarioOptions((prev) => ({
      ...prev,
      [kind]: (prev[kind] ?? []).filter((o) => o.id !== id),
    }));
  }, []);

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
    scenarioOptions,
    addScenarioOption,
    updateScenarioOption,
    removeScenarioOption,
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
