import { describe, it, expect, beforeEach } from "vitest";
import { importAllData, SCHEMA_VERSION, wrapVersioned } from "./storage";
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
