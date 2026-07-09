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

import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { TASK_ATTR_DEFAULTS } from "@/utils/task/taskAttrDefaults";

export const SCHEMA_VERSION = 7;
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
  // v5→v6: 所有 localStorage key 统一使用 { version, data } 包装格式。
  // 数据结构本身无变化；格式转换由 runMigrations 的写回逻辑自动完成。
  (data) => data,
  // v6→v7: 引入多 database。把原全局 taskAttrs 折叠进默认库（id="default"），
  // 并给每个 todo 补 databaseId="default"。原 task_attrs_v1 不再读取（保留以兼容导入导出）。
  (data) => {
    const hadTodos = Array.isArray(data.todos) && data.todos.length;
    const existingAttrs =
      Array.isArray(data.taskAttrs) && data.taskAttrs.length
        ? data.taskAttrs
        : (hadTodos ? TASK_ATTR_DEFAULTS : []);
    const defaultDb = {
      id: "default",
      name: "任务",
      order: 0,
      attrs: existingAttrs.map(a => ({ ...a, system: false })),
    };
    return {
      ...data,
      databases: [defaultDb],
      todos: (data.todos ?? []).map(t => ({ databaseId: "default", ...t })),
    };
  },
];

// 所有 key 统一使用 { version: N, data: T } 包装格式（v6 起）。
// 包装/解包统一走 wrapVersioned / unwrapVersioned，避免各处重复内联判断。
export const WRAPPER_VERSION = 1;

export function wrapVersioned(data) {
  return { version: WRAPPER_VERSION, data };
}

// 解包 { version: number, data: T } 包装；裸数据（迁移前的旧格式）原样返回。
export function unwrapVersioned(parsed) {
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    typeof parsed.version === "number" &&
    "data" in parsed
  ) {
    return parsed.data;
  }
  return parsed;
}

const KEY_MAP = {
  todos:           { key: STORAGE_KEYS.TODOS            },
  scenarios:       { key: STORAGE_KEYS.SCENARIOS        },
  scenarioOptions: { key: STORAGE_KEYS.SCENARIO_OPTIONS },
  focusRecords:  { key: STORAGE_KEYS.FOCUS_RECORDS    },
  coins:         { key: STORAGE_KEYS.COINS            },
  ownedRewards:  { key: STORAGE_KEYS.REWARD_OWNED     },
  redeemCounts:  { key: STORAGE_KEYS.REWARD_REDEEM    },
  activeTheme:   { key: STORAGE_KEYS.ACTIVE_THEME     },
  notes:         { key: STORAGE_KEYS.NOTES            },
  memos:         { key: STORAGE_KEYS.MEMOS            },
  distractions:  { key: STORAGE_KEYS.DISTRACTIONS     },
  chatHistory:   { key: STORAGE_KEYS.CHAT             },
  researchDaily: { key: STORAGE_KEYS.RESEARCH_RECORDS },
  ganttTasks:    { key: STORAGE_KEYS.GANTT_TASKS      },
  ganttProjects: { key: STORAGE_KEYS.GANTT_PROJECTS   },
  taskAttrs:     { key: STORAGE_KEYS.TASK_ATTRS       },
  databases:     { key: STORAGE_KEYS.DATABASES        },
};

// 顺序执行迁移函数，把 schema 从 fromVersion 升级到 SCHEMA_VERSION。
function applyMigrations(data, fromVersion) {
  let current = data;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    if (typeof MIGRATIONS[v] === "function") {
      current = MIGRATIONS[v](current) ?? current;
    }
  }
  return current;
}

// 将 data 中每个已知 key 以 versioned 格式写回 localStorage，返回成功写入的 key 列表。
function writeAllVersioned(data) {
  const writtenKeys = [];
  for (const [name, { key }] of Object.entries(KEY_MAP)) {
    if (!(name in data)) continue;
    try {
      localStorage.setItem(key, JSON.stringify(wrapVersioned(data[name])));
      writtenKeys.push(key);
    } catch { /* 配额溢出时局部失败 */ }
  }
  return writtenKeys;
}

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
 * 读取所有数据 → 顺序执行迁移函数 → 写回（统一 versioned 格式）→ 更新 schema 版本号。
 */
export function runMigrations() {
  try {
    const stored = Number(localStorage.getItem(SCHEMA_META_KEY) ?? 0);
    if (stored >= SCHEMA_VERSION) return;

    const data = {};
    for (const [name, { key }] of Object.entries(KEY_MAP)) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        // 兼容旧格式（裸 JSON）和已有的 versioned 格式
        data[name] = unwrapVersioned(JSON.parse(raw));
      } catch { /* 跳过损坏的键 */ }
    }

    writeAllVersioned(applyMigrations(data, stored));

    localStorage.setItem(SCHEMA_META_KEY, String(SCHEMA_VERSION));
  } catch (e) {
    console.error("[storage] Migration failed:", e);
  }
}

export function exportAllData() {
  const data = {};
  for (const [name, { key }] of Object.entries(KEY_MAP)) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      // 解包 versioned 格式
      data[name] = unwrapVersioned(JSON.parse(raw));
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
  const data = applyMigrations(parsed.data, fileSchemaVersion);
  const writtenKeys = writeAllVersioned(data);

  localStorage.setItem(SCHEMA_META_KEY, String(SCHEMA_VERSION));
  return { success: true, keys: writtenKeys };
}

export { KEY_MAP };
