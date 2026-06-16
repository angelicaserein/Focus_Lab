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

export const SCHEMA_VERSION = 1;
const SCHEMA_META_KEY = "__focuslab_schema";

const MIGRATIONS = [];

// versioned: true  → TodoContext/ScenarioContext 的 {version, data} 格式
// versioned: false → useLocalStorage hook 的裸 JSON 格式
const KEY_MAP = {
  todos:        { key: "todos_v1",             versioned: true  },
  scenarios:    { key: "scenarios_v1",          versioned: true  },
  focusRecords: { key: "focus_records_v1",      versioned: false },
  coins:        { key: "coins_v1",              versioned: false },
  ownedRewards: { key: "reward_owned_v1",       versioned: false },
  redeemCounts: { key: "reward_redeem_v1",      versioned: false },
  activeTheme:  { key: "active_theme_v1",       versioned: false },
  notes:        { key: "focus_notes_v1",        versioned: false },
  distractions: { key: "focus_distractions_v1", versioned: false },
  chatHistory:    { key: "focus_chat_v1",         versioned: false },
  researchDaily:  { key: "research_daily_v1",     versioned: false },
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
          JSON.stringify(versioned ? { version: 1, data: val } : val),
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
      localStorage.setItem(key, JSON.stringify(versioned ? { version: 1, data: val } : val));
      writtenKeys.push(key);
    } catch { /* 配额溢出时局部失败 */ }
  }

  localStorage.setItem(SCHEMA_META_KEY, String(SCHEMA_VERSION));
  return { success: true, keys: writtenKeys };
}

export { KEY_MAP };
