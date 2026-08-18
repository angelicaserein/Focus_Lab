import { describe, it, expect, beforeEach, vi } from "vitest";
import { STORAGE_KEYS } from "./storageKeys";

// 配额警报的回归测试。
//
// 守的是这么一件事：localStorage 满了以后 setItem 抛错、写入失败，而在此之前
// 所有写入方都是各自 catch 掉往控制台打一行——界面照常显示保存成功，用户要等到
// 某天导出备份才发现记录停在几个月前。这里钉死「写不进去必须报出来」。
//
// 警报是模块级状态，每个用例重新 import 一份干净的模块。

const store = new Map();
let failWrites = false; // 打开后 setItem 一律抛配额错，模拟存储写满

globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    if (failWrites) {
      const e = new Error("quota");
      e.name = "QuotaExceededError";
      throw e;
    }
    store.set(k, String(v));
  },
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
};

async function fresh() {
  vi.resetModules();
  return {
    quota: await import("./quotaAlert"),
    storage: await import("./storage"),
  };
}

describe("配额警报", () => {
  beforeEach(() => {
    store.clear();
    failWrites = false;
  });

  it("认得出配额错的各种写法，包括老浏览器的数字编号", async () => {
    const { quota } = await fresh();
    const named = Object.assign(new Error(), { name: "QuotaExceededError" });
    const legacyWebkit = Object.assign(new Error(), { code: 22 });
    const legacyFirefox = Object.assign(new Error(), { name: "NS_ERROR_DOM_QUOTA_REACHED" });

    expect(quota.isQuotaError(named)).toBe(true);
    expect(quota.isQuotaError(legacyWebkit)).toBe(true);
    expect(quota.isQuotaError(legacyFirefox)).toBe(true);
  });

  it("别的错误不算配额错——不然序列化崩了也弹「存储已满」，把人往错路上带", async () => {
    const { quota } = await fresh();
    expect(quota.isQuotaError(new TypeError("循环引用"))).toBe(false);
    expect(quota.isQuotaError(null)).toBe(false);
    expect(quota.reportStorageError(new TypeError("x"), "k")).toBe(false);
    expect(quota.getQuotaState().failed).toBe(false);
  });

  it("报一次就进警报状态，并记下是哪些 key 没存上", async () => {
    const { quota } = await fresh();
    const e = Object.assign(new Error(), { name: "QuotaExceededError" });

    expect(quota.reportStorageError(e, "focus_records")).toBe(true);
    expect(quota.getQuotaState()).toMatchObject({ failed: true, count: 1, keys: ["focus_records"] });
  });

  it("每失败一次 count 都涨——banner 靠它区分「关掉的那次」和「关掉之后又失败了」", async () => {
    // count 不涨的话，用户关一次警报就等于永久静音，之后丢的数据照样无声无息
    const { quota } = await fresh();
    const e = Object.assign(new Error(), { name: "QuotaExceededError" });

    quota.reportStorageError(e, "a");
    quota.reportStorageError(e, "a"); // 同一个 key 重复失败也要涨
    expect(quota.getQuotaState().count).toBe(2);
    expect(quota.getQuotaState().keys).toEqual(["a"]);
  });

  it("订阅者能收到警报", async () => {
    const { quota } = await fresh();
    const seen = [];
    const unsubscribe = quota.subscribeQuota((s) => seen.push(s.count));

    quota.reportStorageError(Object.assign(new Error(), { code: 22 }), "k");
    unsubscribe();
    quota.reportStorageError(Object.assign(new Error(), { code: 22 }), "k");

    expect(seen).toEqual([1]); // 退订之后不再收到
  });

  it("整库写入写不进去时会报警，不再空吞", async () => {
    const { quota, storage } = await fresh();
    failWrites = true;

    storage.importAllData(
      JSON.stringify({ schemaVersion: storage.SCHEMA_VERSION, data: { todos: [{ id: "a" }] } }),
      "replace",
    );

    expect(quota.getQuotaState().failed).toBe(true);
  });

  it("导入只写进去一半时不报成功——用户会以为备份回来了，转头把源文件删掉", async () => {
    const { storage } = await fresh();
    failWrites = true;

    const result = storage.importAllData(
      JSON.stringify({
        schemaVersion: storage.SCHEMA_VERSION,
        data: { todos: [{ id: "a" }], coins: 10 },
      }),
      "replace",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("settings.data.errQuota");
  });

  it("写得下的时候一切照旧，不误报", async () => {
    const { quota, storage } = await fresh();

    const result = storage.importAllData(
      JSON.stringify({ schemaVersion: storage.SCHEMA_VERSION, data: { todos: [{ id: "a" }] } }),
      "replace",
    );

    expect(result.success).toBe(true);
    expect(quota.getQuotaState().failed).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.TODOS)).data).toEqual([{ id: "a" }]);
  });
});
