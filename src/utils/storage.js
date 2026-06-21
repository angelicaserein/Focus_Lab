/**
 * 数据持久化工具。
 *
 * ## 如何添加数据迁移（修改任何数据结构时）
 *   1. 将 SCHEMA_VERSION +1
 *   2. 在 MIGRATIONS 末尾追加一个迁移函数：
 *        (data) => ({ ...data, todos: data.todos.map(...) })
 *      data 的 key 对应 KEY_MAP 里的逻辑名称（todos、coins 等）
 *      值已经是反序列化的 JS 对象；返回完整的 data 对象。
 *
 * ## 示例：v1 → v2，给每个 todo 加上 priority 字段
 *   SCHEMA_VERSION = 2
 *   MIGRATIONS[1] = (data) => ({
 *     ...data,
 *     todos: (data.todos ?? []).map(t => ({ priority: 'normal', ...t })),
 *   })
 *
 * MIGRATIONS[i] 将 schema 从版本 i 升级到 i+1。
 */

import { STORAGE_KEYS } from "./storageKeys";

export const SCHEMA_VERSION = 5;
const SCHEMA_META_KEY = "__focuslab_schema";

const MIGRATIONS = [
  null, // v0→v1: no-op placeholder
  // v1→v2: migrate recurring:boolean → recurringDays:number[]
  (data) => ({
    ...data,
    todos: (data.todos ?? []).map(t => {
      if (!t.recurring) return t;
      const { recurring, ...rest } = t;
      return { ...rest, recurringDays: [0, 1, 2, 3, 4, 5, 6] };
    }),
  }),
  // v2→v3: todos gain optional tags[], scenarios gain optional settings — no transform needed
  (data) => data,
  // v3→v4: todos gain optional priority, dueDate, estimatedMins, notes — no transform needed
  (data) => data,
  // v4→v5: 将 todo 的平铺属性字段迁移到 attrs: {} 对象
  (data) => ({
    ...data,
    todos: (data.todos ?? []).map(t => {
      const { priority, tags, dueDate, estimatedMins, notes, ...rest } = t;
      const attrs = { ...(t.attrs ?? {}) };
      if (priority !== undefined) attrs.priority = priority;
      if (tags?.length)           attrs.tags = tags;
      if (dueDate !== undefined)  attrs.dueDate = dueDate;
      if (estimatedMins !== undefined) attrs.estimatedMins = estimatedMins;
      if (notes !== undefined)    attrs.notes = notes;
      return Object.keys(attrs).length ? { ...rest, attrs } : rest;
    }),
  }),
];

// versioned 数据格式的包装版本号（与 SCHEMA_VERSION 无关，固定为 1）
const VERSIONED_WRAPPER_VERSION = 1;

// versioned: true  → TodoContext/ScenarioContext 的 {version, data} 格式
// versioned: false → useLocalStorage hook 的裸 JSON 格式
const KEY_MAP = {
  todos:        { key: STORAGE_KEYS.TODOS,            versioned: true  },
  scenarios:    { key: STORAGE_KEYS.SCENARIOS,        versioned: true  },
  focusRecords: { key: STORAGE_KEYS.FOCUS_RECORDS,    versioned: false },
  coins:        { key: STORAGE_KEYS.COINS,            versioned: false },
  ownedRewards: { key: STORAGE_KEYS.REWARD_OWNED,     versioned: false },
  redeemCounts: { key: STORAGE_KEYS.REWARD_REDEEM,    versioned: false },
  activeTheme:  { key: STORAGE_KEYS.ACTIVE_THEME,     versioned: false },
  notes:        { key: STORAGE_KEYS.NOTES,            versioned: false },
  distractions: { key: STORAGE_KEYS.DISTRACTIONS,     versioned: false },
  chatHistory:  { key: STORAGE_KEYS.CHAT,             versioned: false },
  researchDaily:{ key: STORAGE_KEYS.RESEARCH_RECORDS, versioned: false },
  taskAttrs:    { key: STORAGE_KEYS.TASK_ATTRS,       versioned: false },
};

/**
 * 从 localStorage 读取带版本号的 JSON 数组。
 * 存储格式: { version: number, data: T[] }
 * 兼容旧格式（裸数组）。
 */
export function loadVersioned(key, version, defaultValue = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    if (parsed?.version === version && Array.isArray(parsed.data)) return parsed.data;
    if (Array.isArray(parsed)) return parsed;
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * 在 app 启动时调用一次（main.jsx），在任何 Context 读取数据前执行。
 * 读取所有数据 → 顺序执行迁移函数 → 写回 → 更新 schema 版本号。
 */
export function runMigrations() {
  try {
    const stored = Number(localStorage.getItem(SCHEMA_META_KEY) ?? 0);
    if (stored >= SCHEMA_VERSION) return;

    const data = {};
    for (const [name, { key, versioned }] of Object.entries(KEY_MAP)) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        const parsed = JSON.parse(raw);
        data[name] = versioned ? (parsed?.data ?? parsed) : parsed;
      } catch { /* 跳过损坏的键 */ }
    }

    let current = data;
    for (let v = stored; v < SCHEMA_VERSION; v++) {
      if (typeof MIGRATIONS[v] === "function") {
        current = MIGRATIONS[v](current) ?? current;
      }
    }

    for (const [name, { key, versioned }] of Object.entries(KEY_MAP)) {
      if (!(name in current)) continue;
      try {
        const val = current[name];
        localStorage.setItem(
          key,
          JSON.stringify(versioned ? { version: VERSIONED_WRAPPER_VERSION, data: val } : val),
        );
      } catch { /* 配额溢出时局部失败 */ }
    }

    localStorage.setItem(SCHEMA_META_KEY, String(SCHEMA_VERSION));
  } catch (e) {
    console.error("[storage] Migration failed:", e);
  }
}

export function exportAllData() {
  const data = {};
  for (const [name, { key, versioned }] of Object.entries(KEY_MAP)) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      const parsed = JSON.parse(raw);
      data[name] = versioned ? (parsed?.data ?? parsed) : parsed;
    } catch { /* 跳过损坏键 */ }
  }
  const json = JSON.stringify(
    { schemaVersion: SCHEMA_VERSION, exportedAt: Date.now(), data },
    null,
    2,
  );
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([json], { type: "application/json" })),
    download: `focuslab-backup-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importAllData(jsonString) {
  let parsed;
  try { parsed = JSON.parse(jsonString); }
  catch { return { success: false, error: "无法解析 JSON 文件" }; }

  // 兼容旧导出格式（version: 1）和新格式（schemaVersion: N）
  const fileSchemaVersion = parsed.schemaVersion ?? (parsed.version === 1 ? 1 : null);
  if (!fileSchemaVersion || typeof parsed.data !== "object")
    return { success: false, error: "文件格式无效" };

  // 对导入数据执行迁移（文件来自旧版本时）
  let data = parsed.data;
  for (let v = fileSchemaVersion; v < SCHEMA_VERSION; v++) {
    if (typeof MIGRATIONS[v] === "function") {
      data = MIGRATIONS[v](data) ?? data;
    }
  }

  const writtenKeys = [];
  for (const [name, { key, versioned }] of Object.entries(KEY_MAP)) {
    if (!(name in data)) continue;
    try {
      const val = data[name];
      localStorage.setItem(key, JSON.stringify(versioned ? { version: VERSIONED_WRAPPER_VERSION, data: val } : val));
      writtenKeys.push(key);
    } catch { /* 配额溢出时局部失败 */ }
  }

  localStorage.setItem(SCHEMA_META_KEY, String(SCHEMA_VERSION));
  return { success: true, keys: writtenKeys };
}

export { KEY_MAP };
