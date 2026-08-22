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
import { reportStorageError } from "@/utils/storage/quotaAlert";
import { TASK_ATTR_DEFAULTS } from "@/utils/task/taskAttrDefaults";
import { TASK_TYPE_OPTIONS } from "@/utils/scenario/scenarioConstants";

export const SCHEMA_VERSION = 10;

// ── 写入闸门 ────────────────────────────────────────────────────
// localStorage 有两类写入方，它们对「什么是最新的数据」有各自的看法：
//   1. 每个挂载着的 usePersistedWrite —— 它写的是组件里那份内存值的镜像，
//      挂载时写一次、值一变再写一次、页面卸载（pagehide）时还要 flush 一次。
//   2. 这里的整库覆写（导入 / 清空历史）—— 它直接改盘上的字节，绕过所有 React 状态。
//
// 第二类写完必然要 reload 才能让页面读到新数据，而 reload 会触发 pagehide，
// 于是第一类把 reload 之前的旧值原样刷回去 —— 刚导入的数据就这么被自己的应用吃掉了，
// 界面上还显示着「导入成功」。（清空历史同理：记录删了，pagehide 又给写回来。）
//
// 所以整库覆写之前先关掉闸门：从这一刻起到页面真正卸载为止，谁都不许再写。
// 反正紧接着就要 reload，这段时间里的任何写入都只可能是「用旧数据盖新数据」。
let writesFrozen = false;

/** 冻结所有经 usePersistedWrite 的写入。只进不出——解冻靠 reload。 */
export function freezeWrites() {
  writesFrozen = true;
}

export function writesAreFrozen() {
  return writesFrozen;
}

// v7 时期的出厂默认标签 id。v8 迁移把它们换成新的 TASK_TYPE_OPTIONS。
const LEGACY_TAG_IDS = ["deep_work", "admin", "creative", "communication", "reading"];
const SCHEMA_META_KEY = "__focuslab_schema";
// 已删除的研究记录页留下的键。只有 v9 迁移用它把老数据抹掉，别再往回加读写。
const LEGACY_RESEARCH_KEY = "research_daily_v1";

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
      nameKey: "tasks.db.defaultName",
      order: 0,
      attrs: existingAttrs.map(a => ({ ...a, system: false })),
    };
    return {
      ...data,
      databases: [defaultDb],
      todos: (data.todos ?? []).map(t => ({ databaseId: "default", ...t })),
    };
  },
  // v7→v8: 重置默认任务标签。旧的 5 个出厂标签（深度工作/事务处理/…）换成
  // 新的 4 个（项目/求职/琐事/玩耍）。自定义标签保留；任务上残留的旧标签值清掉。
  (data) => {
    const stripLegacy = (attrs) => (attrs ?? []).map(a => {
      if (a.id !== "tags") return a;
      const kept = (a.options ?? []).filter(o => !LEGACY_TAG_IDS.includes(o.id));
      const keptIds = new Set(kept.map(o => o.id));
      const seeded = TASK_TYPE_OPTIONS
        .filter(o => !keptIds.has(o.id))
        // 出厂标签的文案在 i18n 里（labelKey），不是写死的 label——
        // 这里若原样拷 label，迁移过来的用户会得到一排没有名字的空标签。
        .map(({ id, labelKey, icon }) => ({ id, labelKey, icon }));
      return { ...a, options: [...kept, ...seeded] };
    });
    return {
      ...data,
      databases: (data.databases ?? []).map(d => ({ ...d, attrs: stripLegacy(d.attrs) })),
      // 兼容仍读 taskAttrs 的旧导入路径
      taskAttrs: data.taskAttrs ? stripLegacy(data.taskAttrs) : data.taskAttrs,
      todos: (data.todos ?? []).map(t => {
        const tags = t.attrs?.tags;
        if (!Array.isArray(tags) || !tags.some(id => LEGACY_TAG_IDS.includes(id))) return t;
        const next = tags.filter(id => !LEGACY_TAG_IDS.includes(id));
        const attrs = { ...t.attrs };
        if (next.length) attrs.tags = next; else delete attrs.tags;
        return { ...t, attrs };
      }),
    };
  },
  // v8→v9: 研究记录页整个删掉了，盘上的 research_daily_v1 不再有任何读写方。
  // 这一条是唯一一个「删键」而不是「改数据」的迁移：键已经不在 KEY_MAP 里，
  // 变换 data 对象碰不到它，只能直接从 localStorage 抹掉，否则它会永远留在
  // 老用户浏览器里占配额。
  (data) => {
    localStorage.removeItem(LEGACY_RESEARCH_KEY);
    return data;
  },
  // v9→v10: 内置「预计时长」列整个删掉了（工时估计对 ADHD 用户只是又一处评判）。
  // 各库的列定义里把它摘掉，任务上残留的值也一并清掉——留着就是永远显示不出来的死键。
  (data) => {
    const stripEst = (attrs) => (attrs ?? []).filter(a => a.id !== "estimatedMins");
    return {
      ...data,
      databases: (data.databases ?? []).map(d => ({ ...d, attrs: stripEst(d.attrs) })),
      // 兼容仍读 taskAttrs 的旧导入路径
      taskAttrs: data.taskAttrs ? stripEst(data.taskAttrs) : data.taskAttrs,
      todos: (data.todos ?? []).map(t => {
        if (t.attrs?.estimatedMins === undefined) return t;
        const { estimatedMins, ...attrs } = t.attrs;
        return { ...t, attrs };
      }),
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

// 导出 / 导入 / 迁移认得的全部键。
//
// 这张表就是「备份里有什么」的定义 —— 设置页那句「清除浏览器缓存前请先导出备份」
// 承诺的是全部身家，所以凡是用户攒出来、丢了就回不来的东西都必须在列：
// 收集品（生态缸的鱼、祈愿图鉴）是用金币换的，DDL 节点、烧瓶架、自定义商品、
// 语气包是手工配的，偏好是一条条调出来的。漏一项，用户照着提示导完备份、
// 清掉缓存，那一项就永远没了 —— 而且导出时界面上不会有任何异样。
//
// 唯一刻意不在列的是隐私须知的「看过没有」（privacy_notice_ack_v1）：
// 那是本机的一次性提示状态、不是用户数据，换台机器就该重新告知一次。
const KEY_MAP = {
  todos:           { key: STORAGE_KEYS.TODOS            },
  scenarios:       { key: STORAGE_KEYS.SCENARIOS        },
  activeScenario:  { key: STORAGE_KEYS.ACTIVE_SCENARIO  },
  scenarioOptions: { key: STORAGE_KEYS.SCENARIO_OPTIONS },
  focusRecords:  { key: STORAGE_KEYS.FOCUS_RECORDS    },
  activityLog:   { key: STORAGE_KEYS.ACTIVITY_LOG     },
  // merge:"max" —— 金币是累计量，重复导入同一份备份不该翻倍（见 mergeValue）
  coins:         { key: STORAGE_KEYS.COINS, merge: "max" },
  ownedRewards:  { key: STORAGE_KEYS.REWARD_OWNED     },
  redeemCounts:  { key: STORAGE_KEYS.REWARD_REDEEM    },
  customRewards: { key: STORAGE_KEYS.REWARD_CUSTOM    },
  activeTheme:   { key: STORAGE_KEYS.ACTIVE_THEME     },
  notes:         { key: STORAGE_KEYS.NOTES            },
  memos:         { key: STORAGE_KEYS.MEMOS            },
  distractions:  { key: STORAGE_KEYS.DISTRACTIONS     },
  chatHistory:   { key: STORAGE_KEYS.CHAT             },
  ganttTasks:    { key: STORAGE_KEYS.GANTT_TASKS      },
  ganttProjects: { key: STORAGE_KEYS.GANTT_PROJECTS   },
  ganttActiveProject: { key: STORAGE_KEYS.GANTT_ACTIVE_PROJECT },
  taskAttrs:     { key: STORAGE_KEYS.TASK_ATTRS       },
  databases:     { key: STORAGE_KEYS.DATABASES        },
  activeDatabase: { key: STORAGE_KEYS.ACTIVE_DB       },
  // 提醒节点：手工配出来的，丢了没法从别处推回来
  ddlCheckpoints: { key: STORAGE_KEYS.DDL_CHECKPOINTS },
  // 收集品：都是用金币换的，等价于钱
  companionCollection: { key: STORAGE_KEYS.COMPANION_COLLECTION },
  companionOutfit:     { key: STORAGE_KEYS.COMPANION_OUTFIT     },
  aquariumCollection:  { key: STORAGE_KEYS.AQUARIUM_COLLECTION  },
  skilltreeUnlocked:   { key: STORAGE_KEYS.SKILLTREE_UNLOCKED   },
  // 烧瓶架：一只只存出来的形状
  flaskShelf:     { key: STORAGE_KEYS.FLASK_SHELF      },
  flaskShelfSort: { key: STORAGE_KEYS.FLASK_SHELF_SORT },
  // 功能树 / 废弃页面的开关名单
  disabledFeatures:  { key: STORAGE_KEYS.DISABLED_FEATURES  },
  enabledDeprecated: { key: STORAGE_KEYS.ENABLED_DEPRECATED },
  // AI 生成的语气包与任务拆分偏好：都是用户提过 prompt / 调过档位才有的
  tonePack:       { key: STORAGE_KEYS.TONE_PACK        },
  taskSplitPrefs: { key: STORAGE_KEYS.TASK_SPLIT_PREFS },
  // 偏好设置
  prefCountupFullMins: { key: STORAGE_KEYS.PREF_COUNTUP_FULL_MINS },
  prefCountdownMins:   { key: STORAGE_KEYS.PREF_COUNTDOWN_MINS    },
  prefCountupPresets:  { key: STORAGE_KEYS.PREF_COUNTUP_PRESETS   },
  prefCountdownPresets:{ key: STORAGE_KEYS.PREF_COUNTDOWN_PRESETS },
  prefTimerMode:    { key: STORAGE_KEYS.PREF_TIMER_MODE     },
  prefFlaskShape:   { key: STORAGE_KEYS.PREF_FLASK_SHAPE    },
  prefAnimEnabled:  { key: STORAGE_KEYS.PREF_ANIM_ENABLED   },
  prefRitualEnabled:{ key: STORAGE_KEYS.PREF_RITUAL_ENABLED },
  prefCardVisible:  { key: STORAGE_KEYS.PREF_CARD_VISIBLE   },
  prefNotifyEnabled:{ key: STORAGE_KEYS.PREF_NOTIFY_ENABLED },
  prefAppWatch:     { key: STORAGE_KEYS.PREF_APP_WATCH      },
  prefLang:         { key: STORAGE_KEYS.PREF_LANG           },
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

// 读出当前 localStorage 里的全部已知 key（解包后的 JS 值），形状同 exportAllData 的 data。
function readAllVersioned() {
  const data = {};
  for (const [name, { key }] of Object.entries(KEY_MAP)) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try { data[name] = unwrapVersioned(JSON.parse(raw)); }
    catch { /* 跳过损坏键 */ }
  }
  return data;
}

// 条目的稳定身份：有 id 用 id，日记类用 date，其余整条内容比对。
// 用于导入合并时判断「这条已经有了」，避免重复导入同一份备份把数据翻倍。
function itemIdentity(item) {
  if (item === null || typeof item !== "object") return `v:${JSON.stringify(item)}`;
  if (typeof item.id === "string" || typeof item.id === "number") return `id:${item.id}`;
  if (typeof item.date === "string") return `date:${item.date}`;
  return `raw:${JSON.stringify(item)}`;
}

// 合并两个数组：保留本地条目（含其后续编辑），只追加本地没有的导入条目。
function mergeArrays(local, incoming) {
  const seen = new Set(local.map(itemIdentity));
  const added = incoming.filter((item) => !seen.has(itemIdentity(item)));
  return [...local, ...added];
}

/**
 * 逐键合并导入数据与本地数据，本地优先：
 *   数组   → 按条目身份去重后追加（本地在前）
 *   对象   → 递归合并（scenarioOptions 的分组数组、redeemCounts 的计数）
 *   其余   → 本地有值就保留本地（activeTheme、各项偏好这类单值）
 *
 * strategy="max" 的键（只有金币）才对数字取较大值 —— 那是累计量，
 * 重复导入同一份备份不该翻倍。其余数字一律走「保留本地」：
 * 偏好里的「倒计时 25 分钟」不是越大越对，拿备份里的 45 盖掉是莫名其妙的。
 */
function mergeValue(local, incoming, strategy) {
  if (local === undefined) return incoming;
  if (incoming === undefined) return local;
  if (Array.isArray(local) && Array.isArray(incoming)) return mergeArrays(local, incoming);
  if (strategy === "max" && typeof local === "number" && typeof incoming === "number") {
    return Math.max(local, incoming);
  }
  if (
    local && incoming &&
    typeof local === "object" && typeof incoming === "object" &&
    !Array.isArray(local) && !Array.isArray(incoming)
  ) {
    const out = { ...local };
    // 嵌套层不再继承 max：策略是按顶层键定的（redeemCounts 的计数各自为政）
    for (const [k, v] of Object.entries(incoming)) out[k] = mergeValue(local[k], v);
    return out;
  }
  return local;
}

// 只返回文件里出现过的 key（其余本地键无需重写），值为合并结果。
function mergeAllData(local, incoming) {
  const out = {};
  for (const [name, { merge }] of Object.entries(KEY_MAP)) {
    if (!(name in incoming)) continue;
    out[name] = mergeValue(local[name], incoming[name], merge);
  }
  return out;
}

// 将 data 中每个已知 key 以 versioned 格式写回 localStorage，返回成功写入的 key 列表。
function writeAllVersioned(data) {
  const writtenKeys = [];
  for (const [name, { key }] of Object.entries(KEY_MAP)) {
    if (!(name in data)) continue;
    try {
      localStorage.setItem(key, JSON.stringify(wrapVersioned(data[name])));
      writtenKeys.push(key);
    } catch (e) {
      // 配额溢出时局部失败。以前这里空吞，于是导入会「成功」一半：
      // 提示写着导入 12 项，实际只落盘 5 项，剩下的悄悄没了。现在报出去。
      reportStorageError(e, key);
    }
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
 * 从 localStorage 读取单个标量（非数组）值，解包 { version, data } 包装；
 * 兼容旧裸格式。可选 validate 谓词：解包后的值不合法时回退 defaultValue。
 * （loadVersioned 只认数组，标量场景用本函数，避免各处重复内联 try/catch 解包。）
 */
export function loadVersionedScalar(key, validate = null, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const value = unwrapVersioned(JSON.parse(raw));
    if (validate && !validate(value)) return defaultValue;
    return value;
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
    const corrupt = new Set();
    for (const [name, { key }] of Object.entries(KEY_MAP)) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        // 兼容旧格式（裸 JSON）和已有的 versioned 格式
        data[name] = unwrapVersioned(JSON.parse(raw));
      } catch { corrupt.add(name); }
    }

    // 迁移函数写的是 `todos: (data.todos ?? []).map(...)`，读不出来的键会被它补成 []，
    // 于是「跳过损坏键」在写回这一步变成「拿空数组盖掉损坏键」——原始字节没了，
    // 用户连手工抢救的机会都没有。所以损坏的键读不回来也不写回去，原样留在盘上。
    const migrated = applyMigrations(data, stored);
    for (const name of corrupt) delete migrated[name];
    writeAllVersioned(migrated);

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

/**
 * 导入备份文件。
 * mode="merge"（默认）：把文件里的条目并进现有数据，本地已有的条目原样保留，
 *   只追加本地没有的；同一份备份重复导入不会产生重复条目。
 * mode="replace"：用文件内容覆盖同名 key（旧行为）。
 */
export function importAllData(jsonString, mode = "merge") {
  let parsed;
  try { parsed = JSON.parse(jsonString); }
  // error 回的是 i18n key（调用方用 t() 取文案），不在这一层写死语言。
  catch { return { success: false, error: "settings.data.errParse" }; }

  // 兼容旧导出格式（version: 1）和新格式（schemaVersion: N）
  const fileSchemaVersion = parsed.schemaVersion ?? (parsed.version === 1 ? 1 : null);
  if (!fileSchemaVersion || typeof parsed.data !== "object")
    return { success: false, error: "settings.data.errFormat" };

  // 先落闸再写：调用方写完就会 reload，而 reload 的 pagehide 会让所有挂载着的
  // usePersistedWrite 把导入之前的内存值刷回盘上，把这一整次导入悄悄吃掉。
  freezeWrites();

  // 对导入数据执行迁移（文件来自旧版本时）
  const incoming = applyMigrations(parsed.data, fileSchemaVersion);
  const data = mode === "replace" ? incoming : mergeAllData(readAllVersioned(), incoming);
  const writtenKeys = writeAllVersioned(data);

  // 配额不够时 writeAllVersioned 会写掉一部分就写不动了。这时候还报「导入成功 N 项」
  // 就是在骗人——用户会以为备份已经回来了，转头把源文件删掉。
  const expected = Object.keys(KEY_MAP).filter((name) => name in data).length;
  if (writtenKeys.length < expected) {
    return { success: false, error: "settings.data.errQuota", keys: writtenKeys };
  }

  localStorage.setItem(SCHEMA_META_KEY, String(SCHEMA_VERSION));
  return { success: true, keys: writtenKeys };
}

export { KEY_MAP };
