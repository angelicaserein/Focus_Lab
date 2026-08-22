import { describe, it, expect, beforeEach } from "vitest";
import { importAllData, SCHEMA_VERSION, wrapVersioned, KEY_MAP } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";

// 测试环境是 node（见 vite.config.js），用最小 localStorage 桩替代浏览器实现
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
};

const backup = (data) => JSON.stringify({ schemaVersion: SCHEMA_VERSION, data });

const readKey = (key) => JSON.parse(localStorage.getItem(key)).data;

describe("importAllData", () => {
  beforeEach(() => localStorage.clear());

  it("默认把导入条目追加到现有数据后面", () => {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(wrapVersioned([{ id: "a", text: "本地" }])));

    const result = importAllData(backup({ todos: [{ id: "b", text: "导入" }] }));

    expect(result.success).toBe(true);
    expect(readKey(STORAGE_KEYS.TODOS)).toEqual([
      { id: "a", text: "本地" },
      { id: "b", text: "导入" },
    ]);
  });

  it("重复导入同一份备份不产生重复条目，且不覆盖本地的后续编辑", () => {
    const file = backup({ todos: [{ id: "a", text: "原文案" }] });
    importAllData(file);
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(wrapVersioned([{ id: "a", text: "改过了" }])));

    importAllData(file);

    expect(readKey(STORAGE_KEYS.TODOS)).toEqual([{ id: "a", text: "改过了" }]);
  });

  it("金币取较大值，主题等单选项保留本地", () => {
    localStorage.setItem(STORAGE_KEYS.COINS, JSON.stringify(wrapVersioned(120)));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_THEME, JSON.stringify(wrapVersioned("ocean")));

    importAllData(backup({ coins: 30, activeTheme: "forest" }));

    expect(readKey(STORAGE_KEYS.COINS)).toBe(120);
    expect(readKey(STORAGE_KEYS.ACTIVE_THEME)).toBe("ocean");
  });

  it("没有 id 的条目按 date 去重", () => {
    localStorage.setItem(
      STORAGE_KEYS.TODOS,
      JSON.stringify(wrapVersioned([{ date: "2026-08-01", note: "本地" }])),
    );

    importAllData(backup({
      todos: [{ date: "2026-08-01", note: "导入" }, { date: "2026-08-02", note: "新的" }],
    }));

    expect(readKey(STORAGE_KEYS.TODOS)).toEqual([
      { date: "2026-08-01", note: "本地" },
      { date: "2026-08-02", note: "新的" },
    ]);
  });

  it("mode=replace 时仍然整体覆盖", () => {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(wrapVersioned([{ id: "a" }])));

    importAllData(backup({ todos: [{ id: "b" }] }), "replace");

    expect(readKey(STORAGE_KEYS.TODOS)).toEqual([{ id: "b" }]);
  });

  it("格式无效时不写入任何东西", () => {
    expect(importAllData("{ 不是 json").success).toBe(false);
    expect(importAllData(JSON.stringify({ data: {} })).success).toBe(false);
    expect(localStorage.length).toBe(0);
  });
});


// 备份的完整性守护。KEY_MAP 就是「导出文件里有什么」的定义，而设置页那句
// 「清除浏览器缓存前请先导出备份」承诺的是全部身家 —— 漏一个键不会报错，
// 只会让用户在清缓存之后发现生态缸空了、DDL 节点没了。加新 STORAGE_KEYS 时
// 这条会红，逼你当场决定它该不该进备份。
describe("KEY_MAP 覆盖全部用户数据键", () => {
  // 刻意不进备份的键，每个都要写清楚为什么。
  const EXCLUDED = {
    // 本机的一次性提示状态，不是用户数据：换台机器就该重新告知一次
    // （键名写死在 utils/privacy/privacyNotice.js，不在 STORAGE_KEYS 里）
    FLASK_DEBUG_FILL: "仅开发环境的水位调试覆盖，不是真实数据",
    DDL_MODAL_DISMISSED: "「今天已关掉这个弹窗」，跨设备重放没有意义",
    DDL_NOTIFIED: "「今天已经通知过了」的去重记号，同上",
  };

  it("STORAGE_KEYS 里的每个键，要么在 KEY_MAP 里，要么在豁免名单里说明了理由", () => {
    const mapped = new Set(Object.values(KEY_MAP).map((e) => e.key));
    const missing = Object.entries(STORAGE_KEYS)
      .filter(([name, key]) => !mapped.has(key) && !(name in EXCLUDED))
      .map(([name]) => name);
    expect(missing).toEqual([]);
  });

  it("KEY_MAP 里没有指向已删除 STORAGE_KEYS 的死条目", () => {
    const known = new Set(Object.values(STORAGE_KEYS));
    const stale = Object.entries(KEY_MAP)
      .filter(([, e]) => !known.has(e.key))
      .map(([name]) => name);
    expect(stale).toEqual([]);
  });

  it("同一个 localStorage 键不会在 KEY_MAP 里挂两个名字", () => {
    const keys = Object.values(KEY_MAP).map((e) => e.key);
    expect(keys.length).toBe(new Set(keys).size);
  });
});
