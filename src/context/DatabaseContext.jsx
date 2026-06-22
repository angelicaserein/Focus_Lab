import React, { useReducer, useState, useEffect, useContext, useMemo, useCallback } from "react";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { loadVersioned } from "../utils/storage";
import { DATABASE_TEMPLATES } from "../utils/databaseTemplates";

const WRAPPER_VERSION = 1;
export const DEFAULT_DB_ID = "default";

// database CRUD
const ADD_DB     = "ADD_DB";
const RENAME_DB  = "RENAME_DB";
const DELETE_DB  = "DELETE_DB";
const REORDER_DB = "REORDER_DB";
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
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_DB);
    if (raw) {
      const parsed = JSON.parse(raw);
      const id = parsed?.data ?? parsed;
      if (typeof id === "string" && databases.some(d => d.id === id)) return id;
    }
  } catch { /* ignore */ }
  return databases[0]?.id ?? DEFAULT_DB_ID;
}

const cloneAttr = (a) => ({
  ...a,
  ...(a.options ? { options: a.options.map(o => ({ ...o })) } : {}),
});

const DatabaseContext = React.createContext(null);

export function DatabaseProvider({ children }) {
  const [databases, dispatch] = useReducer(reducer, undefined, loadDatabases);
  const [activeDatabaseId, setActiveDatabaseId] = useState(() => loadActiveDbId(loadDatabases()));

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.DATABASES,
      JSON.stringify({ version: WRAPPER_VERSION, data: databases }),
    );
  }, [databases]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.ACTIVE_DB,
      JSON.stringify({ version: WRAPPER_VERSION, data: activeDatabaseId }),
    );
  }, [activeDatabaseId]);

  const activeDatabase = useMemo(
    () => databases.find(d => d.id === activeDatabaseId) ?? databases[0],
    [databases, activeDatabaseId],
  );

  // ---- database CRUD ----
  const addDatabase = useCallback((name, templateId) => {
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
  }, [databases]);

  const renameDatabase = useCallback((id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: RENAME_DB, payload: { id, name: trimmed } });
  }, []);

  const deleteDatabase = useCallback((id) => {
    if (id === DEFAULT_DB_ID) return; // 默认库不可删除
    dispatch({ type: DELETE_DB, payload: id });
    if (activeDatabaseId === id) setActiveDatabaseId(DEFAULT_DB_ID);
  }, [activeDatabaseId]);

  const setActiveDatabase = useCallback((id) => setActiveDatabaseId(id), []);

  const reorderDatabases = useCallback(
    (orderedIds) => dispatch({ type: REORDER_DB, payload: orderedIds }),
    [],
  );

  // ---- 列（属性）CRUD，作用于指定库（默认 active 库）----
  const addTaskAttr = useCallback((name, type, options, dbId = activeDatabaseId) => {
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
  }, [databases, activeDatabaseId]);

  const updateTaskAttr = useCallback((id, patch, dbId = activeDatabaseId) =>
    dispatch({ type: UPDATE_ATTR, dbId, payload: { id, patch } }), [activeDatabaseId]);

  const deleteTaskAttr = useCallback((id, dbId = activeDatabaseId) =>
    dispatch({ type: DELETE_ATTR, dbId, payload: id }), [activeDatabaseId]);

  const reorderTaskAttrs = useCallback((orderedIds, dbId = activeDatabaseId) =>
    dispatch({ type: REORDER_ATTRS, dbId, payload: orderedIds }), [activeDatabaseId]);

  const value = useMemo(() => ({
    databases,
    activeDatabaseId,
    activeDatabase,
    addDatabase,
    renameDatabase,
    deleteDatabase,
    setActiveDatabase,
    reorderDatabases,
    addTaskAttr,
    updateTaskAttr,
    deleteTaskAttr,
    reorderTaskAttrs,
  }), [
    databases,
    activeDatabaseId,
    activeDatabase,
    addDatabase,
    renameDatabase,
    deleteDatabase,
    setActiveDatabase,
    reorderDatabases,
    addTaskAttr,
    updateTaskAttr,
    deleteTaskAttr,
    reorderTaskAttrs,
  ]);

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
