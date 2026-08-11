import { describe, it, expect, beforeEach, vi } from "vitest";
import { STORAGE_KEYS } from "./storageKeys";

// 写入闸门的回归测试。
//
// 被它挡住的那个 bug：导入数据 / 清空历史都是「直接改 localStorage → reload」，
// 而 reload 会触发 pagehide，让所有挂载着的 usePersistedWrite 把导入之前的内存值
// 刷回盘上。表现是界面显示「导入成功」，刷新完却什么都没变——数据被自己的应用吃掉了。
//
// 闸门是模块级状态、而且刻意只进不出（解冻只靠 reload），所以每个用例都重新
// import 一份干净的模块，不共享同一个已经落了闸的实例。

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
};

async function freshStorage() {
  vi.resetModules();
  return import("./storage");
}

const backup = (data, schemaVersion) =>
  JSON.stringify({ schemaVersion, data });

describe("写入闸门", () => {
  beforeEach(() => localStorage.clear());

  it("默认是开着的：平时的写入一切照旧", async () => {
    const { writesAreFrozen } = await freshStorage();
    expect(writesAreFrozen()).toBe(false);
  });

  it("导入成功后落闸，挡住 reload 时把旧数据刷回来的那一下", async () => {
    const { importAllData, writesAreFrozen, SCHEMA_VERSION } = await freshStorage();

    const result = importAllData(backup({ todos: [{ id: "b" }] }, SCHEMA_VERSION));

    expect(result.success).toBe(true);
    expect(writesAreFrozen()).toBe(true);
  });

  it("导入失败时不落闸——选错文件不该把这一整局的写入全废掉", async () => {
    const { importAllData, writesAreFrozen } = await freshStorage();

    expect(importAllData("{ 不是 json").success).toBe(false);
    expect(importAllData(JSON.stringify({ data: {} })).success).toBe(false);
    expect(writesAreFrozen()).toBe(false);
  });

  it("落闸挡的是 usePersistedWrite，不挡整库写入本身", async () => {
    // 闸门要是把 importAllData 自己也挡了，第二次导入就会静默失败
    const { importAllData, freezeWrites, SCHEMA_VERSION } = await freshStorage();

    freezeWrites();
    const result = importAllData(backup({ todos: [{ id: "c" }] }, SCHEMA_VERSION), "replace");

    expect(result.success).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.TODOS)).data).toEqual([{ id: "c" }]);
  });

  it("落闸只进不出", async () => {
    const { freezeWrites, writesAreFrozen } = await freshStorage();
    freezeWrites();
    freezeWrites();
    expect(writesAreFrozen()).toBe(true);
  });
});
