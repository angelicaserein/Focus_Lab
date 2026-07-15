import React, { useReducer, useState, useContext, useMemo } from "react";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { loadVersioned, loadVersionedScalar, WRAPPER_VERSION } from "@/utils/storage/storage";
import usePersistedWrite from "@/hooks/common/usePersistedWrite";
import { DATABASE_TEMPLATES } from "@/utils/task/databaseTemplates";

export const DEFAULT_DB_ID = "default";

// database CRUD
const ADD_DB     = "ADD_DB";
const RENAME_DB  = "RENAME_DB";
const DELETE_DB  = "DELETE_DB";
const REORDER_DB = "REORDER_DB";
const SET_DBS    = "SET_DBS";
// 按 dbId 作用域的列（属性）CRUD
const ADD_ATTR     = "ADD_ATTR";
const UPDATE_ATTR  = "UPDATE_ATTR";
const DELETE_ATTR  = "DELETE_ATTR";
const REORDER_ATTRS = "REORDER_ATTRS";

function mapDbAttrs(state, dbId, fn) {
  return state.map(d => d.id === dbId ? { ...d, attrs: fn(d.attrs ?? []) } : d);
}

function reducer(state, action) {
  switch (action.type) {
    case ADD_DB:
      return [...state, action.payload];
    case RENAME_DB:
      return state.map(d => d.id === action.payload.id ? { ...d, name: action.payload.name } : d);
    case DELETE_DB:
      return state.filter(d => d.id !== action.payload);
    case REORDER_DB: {
      const map = Object.fromEntries(state.map(d => [d.id, d]));
      return action.payload.filter(id => map[id]).map((id, i) => ({ ...map[id], order: i }));
    }
    case SET_DBS:
      return action.payload;

    case ADD_ATTR:
      return mapDbAttrs(state, action.dbId, attrs => [...attrs, action.payload]);
    case UPDATE_ATTR: {
      const { id, patch } = action.payload;
      return mapDbAttrs(state, action.dbId, attrs => attrs.map(a => a.id === id ? { ...a, ...patch } : a));
    }
    case DELETE_ATTR:
      return mapDbAttrs(state, action.dbId, attrs => attrs.filter(a => a.id !== action.payload));
    case REORDER_ATTRS: {
      const orderedIds = action.payload;
      return mapDbAttrs(state, action.dbId, attrs => {
        const map = Object.fromEntries(attrs.map(a => [a.id, a]));
        return orderedIds.filter(id => map[id]).map((id, i) => ({ ...map[id], order: i }));
      });
    }
    default:
      return state;
  }
}

function loadDatabases() {
  const data = loadVersioned(STORAGE_KEYS.DATABASES, WRAPPER_VERSION, null);
  if (Array.isArray(data) && data.length) return data;
  // 全新安装：默认空库（无内置列，符合「默认就是什么都没有」）
  return [{ id: DEFAULT_DB_ID, name: "任务", order: 0, attrs: [] }];
}

function loadActiveDbId(databases) {
  return loadVersionedScalar(
    STORAGE_KEYS.ACTIVE_DB,
    (id) => typeof id === "string" && databases.some(d => d.id === id),
    databases[0]?.id ?? DEFAULT_DB_ID,
  );
}

const cloneAttr = (a) => ({
  ...a,
  ...(a.options ? { options: a.options.map(o => ({ ...o })) } : {}),
});

const DatabaseContext = React.createContext(null);

export function DatabaseProvider({ children }) {
  const [databases, dispatch] = useReducer(reducer, undefined, loadDatabases);
  const [activeDatabaseId, setActiveDatabaseId] = useState(() => loadActiveDbId(loadDatabases()));

  usePersistedWrite(STORAGE_KEYS.DATABASES, databases);
  usePersistedWrite(STORAGE_KEYS.ACTIVE_DB, activeDatabaseId);

  const activeDatabase = databases.find(d => d.id === activeDatabaseId) ?? databases[0];

  // 全库聚合的「标签」选项：情境的「任务类型」以此为唯一来源（按 id 去重，先出现者优先）。
  // 标签列以约定 id "tags" 标识；各库各自维护一份，这里取并集供跨库情境筛选使用。
  const allTagOptions = useMemo(() => {
    const seen = new Map();
    for (const db of databases) {
      const tagsAttr = (db.attrs ?? []).find(a => a.id === "tags");
      for (const opt of tagsAttr?.options ?? []) {
        if (opt && !seen.has(opt.id)) seen.set(opt.id, opt);
      }
    }
    return [...seen.values()];
  }, [databases]);

  // ---- database CRUD ----
  const addDatabase = (name, templateId) => {
    const tpl = DATABASE_TEMPLATES.find(t => t.id === templateId);
    const id = crypto.randomUUID();
    const maxOrder = databases.reduce((m, d) => Math.max(m, d.order), -1);
    dispatch({
      type: ADD_DB,
      payload: {
        id,
        name: name.trim() || "新建库",
        order: maxOrder + 1,
        attrs: (tpl?.attrs ?? []).map(cloneAttr),
      },
    });
    setActiveDatabaseId(id);
    return id;
  };

  const renameDatabase = (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: RENAME_DB, payload: { id, name: trimmed } });
  };

  const deleteDatabase = (id) => {
    if (id === DEFAULT_DB_ID) return; // 默认库不可删除
    dispatch({ type: DELETE_DB, payload: id });
    if (activeDatabaseId === id) setActiveDatabaseId(DEFAULT_DB_ID);
  };

  const setActiveDatabase = (id) => setActiveDatabaseId(id);

  const reorderDatabases = (orderedIds) => dispatch({ type: REORDER_DB, payload: orderedIds });

  // ---- 列（属性）CRUD，作用于指定库（默认 active 库）----
  const addTaskAttr = (name, type, options, dbId = activeDatabaseId) => {
    const db = databases.find(d => d.id === dbId);
    const maxOrder = (db?.attrs ?? []).reduce((m, a) => Math.max(m, a.order), -1);
    dispatch({
      type: ADD_ATTR,
      dbId,
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

  const updateTaskAttr = (id, patch, dbId = activeDatabaseId) =>
    dispatch({ type: UPDATE_ATTR, dbId, payload: { id, patch } });

  const deleteTaskAttr = (id, dbId = activeDatabaseId) =>
    dispatch({ type: DELETE_ATTR, dbId, payload: id });

  const reorderTaskAttrs = (orderedIds, dbId = activeDatabaseId) =>
    dispatch({ type: REORDER_ATTRS, dbId, payload: orderedIds });

  const value = {
    databases,
    activeDatabaseId,
    activeDatabase,
    allTagOptions,
    addDatabase,
    renameDatabase,
    deleteDatabase,
    setActiveDatabase,
    reorderDatabases,
    addTaskAttr,
    updateTaskAttr,
    deleteTaskAttr,
    reorderTaskAttrs,
  };

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabases() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error("useDatabases must be used within DatabaseProvider");
  return ctx;
}

/**
 * 兼容钩子：返回当前 active 库的列 schema 及绑定到 active 库的列 CRUD，
 * 让 AttrHeaderEditor 等沿用旧接口几乎无需改动。
 */
export function useTaskAttrs() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error("useTaskAttrs must be used within DatabaseProvider");
  return {
    taskAttrs: ctx.activeDatabase?.attrs ?? [],
    addTaskAttr: ctx.addTaskAttr,
    updateTaskAttr: ctx.updateTaskAttr,
    deleteTaskAttr: ctx.deleteTaskAttr,
    reorderTaskAttrs: ctx.reorderTaskAttrs,
  };
}
