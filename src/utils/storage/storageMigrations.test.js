import { describe, it, expect, beforeEach, vi } from "vitest";
import { runMigrations, loadVersioned, loadVersionedScalar, wrapVersioned, unwrapVersioned, SCHEMA_VERSION } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";
import { TASK_TYPE_OPTIONS } from "@/utils/scenario/scenarioConstants";

// 迁移是「跑一次、写回盘、旧格式再也读不到」的单向操作：写坏了不是报错，
// 是用户的任务/标签在下次打开时安静地少一块。所以这里逐版本锁住每条迁移的行为。
//
// 测试环境是 node（见 vite.config.js），用最小 localStorage 桩替代浏览器实现。
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
};

const SCHEMA_META_KEY = "__focuslab_schema";

// 把「schema 停在第 from 版、盘上是裸 JSON」这个初始局面摆出来
const seed = (from, raw) => {
  localStorage.clear();
  localStorage.setItem(SCHEMA_META_KEY, String(from));
  for (const [key, value] of Object.entries(raw)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const readKey = (key) => unwrapVersioned(JSON.parse(localStorage.getItem(key)));

describe("runMigrations", () => {
  beforeEach(() => localStorage.clear());

  it("v1→v2：recurring:true 换成整周的 recurringDays", () => {
    seed(1, { [STORAGE_KEYS.TODOS]: [{ id: "a", text: "每天", recurring: true }] });

    runMigrations();

    expect(readKey(STORAGE_KEYS.TODOS)[0]).toMatchObject({
      id: "a",
      recurringDays: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(readKey(STORAGE_KEYS.TODOS)[0]).not.toHaveProperty("recurring");
  });

  it("v1→v2：不重复的任务原样不动，不会凭空长出 recurringDays", () => {
    seed(1, { [STORAGE_KEYS.TODOS]: [{ id: "a", text: "一次性" }] });

    runMigrations();

    expect(readKey(STORAGE_KEYS.TODOS)[0]).not.toHaveProperty("recurringDays");
  });

  it("v4→v5：平铺的属性字段收进 attrs", () => {
    seed(4, {
      [STORAGE_KEYS.TODOS]: [
        { id: "a", text: "写论文", priority: "important", tags: ["project"], dueDate: "2026-09-01", estimatedMins: 90, notes: "第三章" },
      ],
    });

    runMigrations();

    const [todo] = readKey(STORAGE_KEYS.TODOS);
    expect(todo.attrs).toEqual({
      priority: "important",
      tags: ["project"],
      dueDate: "2026-09-01",
      estimatedMins: 90,
      notes: "第三章",
    });
    // 平铺字段要真的搬走，不能一份数据两处放着各自漂移
    expect(todo).not.toHaveProperty("priority");
    expect(todo).not.toHaveProperty("tags");
  });

  it("v4→v5：一个属性都没有的任务不会多出空 attrs", () => {
    seed(4, { [STORAGE_KEYS.TODOS]: [{ id: "a", text: "裸任务" }] });

    runMigrations();

    expect(readKey(STORAGE_KEYS.TODOS)[0]).not.toHaveProperty("attrs");
  });

  it("v4→v5：空 tags 数组不算属性，不搬进 attrs", () => {
    seed(4, { [STORAGE_KEYS.TODOS]: [{ id: "a", tags: [] }] });

    runMigrations();

    expect(readKey(STORAGE_KEYS.TODOS)[0]).not.toHaveProperty("attrs");
  });

  it("v6→v7：老用户的任务折进默认库，属性表继承下来且不再是系统属性", () => {
    seed(6, {
      [STORAGE_KEYS.TODOS]: [{ id: "a", text: "旧任务" }],
      [STORAGE_KEYS.TASK_ATTRS]: [
        { id: "priority", nameKey: "tasks.attr.priority", system: true, options: [] },
      ],
    });

    runMigrations();

    const [db] = readKey(STORAGE_KEYS.DATABASES);
    expect(db.id).toBe("default");
    // system:false 是关键：迁移过来的属性得允许用户改名/删除，不能被锁成出厂列
    expect(db.attrs).toEqual([
      { id: "priority", nameKey: "tasks.attr.priority", system: false, options: [] },
    ]);
    expect(readKey(STORAGE_KEYS.TODOS)[0].databaseId).toBe("default");
  });

  it("v6→v7：没有自定义属性表的老用户拿到出厂属性", () => {
    seed(6, { [STORAGE_KEYS.TODOS]: [{ id: "a" }] });

    runMigrations();

    const [db] = readKey(STORAGE_KEYS.DATABASES);
    expect(db.attrs.map(a => a.id)).toContain("priority");
    expect(db.attrs.every(a => a.system === false)).toBe(true);
  });

  it("v6→v7：一条任务都没有的空库不塞出厂属性", () => {
    seed(6, { [STORAGE_KEYS.TODOS]: [] });

    runMigrations();

    expect(readKey(STORAGE_KEYS.DATABASES)[0].attrs).toEqual([]);
  });

  it("v7→v8：旧的 5 个出厂标签换成新的一套，自定义标签留着", () => {
    seed(7, {
      [STORAGE_KEYS.DATABASES]: [{
        id: "default",
        attrs: [{
          id: "tags",
          options: [
            { id: "deep_work", label: "深度工作" },
            { id: "reading", label: "阅读" },
            { id: "my_tag", label: "我自己加的" },
          ],
        }],
      }],
    });

    runMigrations();

    const options = readKey(STORAGE_KEYS.DATABASES)[0].attrs[0].options;
    expect(options.map(o => o.id)).toEqual([
      "my_tag",
      ...TASK_TYPE_OPTIONS.map(o => o.id),
    ]);
    // 出厂标签的文案在 i18n 里：补进来的必须带 labelKey，否则界面上是一排没名字的空标签
    expect(options.filter(o => o.id !== "my_tag").every(o => o.labelKey)).toBe(true);
  });

  it("v7→v8：非 tags 的属性列不受影响", () => {
    seed(7, {
      [STORAGE_KEYS.DATABASES]: [{
        id: "default",
        attrs: [{ id: "priority", options: [{ id: "deep_work", label: "同名但不是标签" }] }],
      }],
    });

    runMigrations();

    expect(readKey(STORAGE_KEYS.DATABASES)[0].attrs[0].options).toEqual([
      { id: "deep_work", label: "同名但不是标签" },
    ]);
  });

  it("v7→v8：任务上残留的旧标签值清掉，新标签保留", () => {
    seed(7, {
      [STORAGE_KEYS.TODOS]: [
        { id: "a", attrs: { tags: ["deep_work", "project"], notes: "留着" } },
        { id: "b", attrs: { tags: ["reading"] } },
        { id: "c", attrs: { tags: ["project"] } },
      ],
    });

    runMigrations();

    const todos = readKey(STORAGE_KEYS.TODOS);
    expect(todos[0].attrs).toEqual({ tags: ["project"], notes: "留着" });
    // 只剩旧标签时整个 tags 键删掉，而不是留一个空数组当「筛选出空标签」的假阳性
    expect(todos[1].attrs).not.toHaveProperty("tags");
    expect(todos[2].attrs.tags).toEqual(["project"]);
  });

  it("v8→v9：研究记录页删掉后，盘上残留的 research_daily_v1 被抹掉", () => {
    seed(8, {
      "research_daily_v1": [{ date: "2026-08-01", experience: "旧数据" }],
      [STORAGE_KEYS.TODOS]: [{ id: "a", text: "别动我" }],
    });

    runMigrations();

    expect(localStorage.getItem("research_daily_v1")).toBeNull();
    expect(readKey(STORAGE_KEYS.TODOS)).toEqual([{ id: "a", text: "别动我" }]);
  });

  it("已经是最新版本时直接短路，不重写盘上的数据", () => {
    localStorage.setItem(SCHEMA_META_KEY, String(SCHEMA_VERSION));
    // 故意留一份裸格式：真跑了迁移就会被包成 versioned
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify([{ id: "a", recurring: true }]));

    runMigrations();

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.TODOS))).toEqual([{ id: "a", recurring: true }]);
  });

  it("迁移完把所有键写成 versioned 格式并记下版本号", () => {
    seed(1, { [STORAGE_KEYS.COINS]: 120 });

    runMigrations();

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.COINS))).toEqual(wrapVersioned(120));
    expect(localStorage.getItem(SCHEMA_META_KEY)).toBe(String(SCHEMA_VERSION));
  });

  it("某个键的 JSON 坏了就跳过它，其余键照常迁移", () => {
    seed(1, { [STORAGE_KEYS.COINS]: 30 });
    localStorage.setItem(STORAGE_KEYS.TODOS, "{ 半截 json");

    runMigrations();

    expect(readKey(STORAGE_KEYS.COINS)).toBe(30);
    expect(localStorage.getItem(STORAGE_KEYS.TODOS)).toBe("{ 半截 json");
    expect(localStorage.getItem(SCHEMA_META_KEY)).toBe(String(SCHEMA_VERSION));
  });

  it("localStorage 整个抛异常时只记日志，不把启动流程带崩", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => {},
    };

    expect(() => runMigrations()).not.toThrow();
    expect(spy).toHaveBeenCalled();

    globalThis.localStorage = original;
    spy.mockRestore();
  });
});

describe("loadVersioned", () => {
  beforeEach(() => localStorage.clear());

  it("版本号对得上就返回 data 数组", () => {
    localStorage.setItem("k", JSON.stringify({ version: 3, data: [1, 2] }));
    expect(loadVersioned("k", 3)).toEqual([1, 2]);
  });

  it("版本号对不上就回落默认值，不拿旧结构的数据去喂新代码", () => {
    localStorage.setItem("k", JSON.stringify({ version: 2, data: [1, 2] }));
    expect(loadVersioned("k", 3, ["兜底"])).toEqual(["兜底"]);
  });

  it("兼容没包版本的裸数组", () => {
    localStorage.setItem("k", JSON.stringify([1, 2]));
    expect(loadVersioned("k", 3)).toEqual([1, 2]);
  });

  it("键不存在 / JSON 坏了 / 数据不是数组，一律回落默认值", () => {
    expect(loadVersioned("missing", 1)).toEqual([]);
    localStorage.setItem("bad", "{ 半截");
    expect(loadVersioned("bad", 1, ["兜底"])).toEqual(["兜底"]);
    localStorage.setItem("obj", JSON.stringify({ version: 1, data: { a: 1 } }));
    expect(loadVersioned("obj", 1, ["兜底"])).toEqual(["兜底"]);
  });
});

describe("loadVersionedScalar", () => {
  beforeEach(() => localStorage.clear());

  it("解包 versioned 标量，也认裸值", () => {
    localStorage.setItem("k", JSON.stringify(wrapVersioned("ocean")));
    expect(loadVersionedScalar("k")).toBe("ocean");
    localStorage.setItem("raw", JSON.stringify("forest"));
    expect(loadVersionedScalar("raw")).toBe("forest");
  });

  it("validate 不通过时回落默认值", () => {
    localStorage.setItem("k", JSON.stringify(wrapVersioned("countdown")));
    const isMode = (v) => v === "countup" || v === "countdown";
    expect(loadVersionedScalar("k", isMode, "countup")).toBe("countdown");

    localStorage.setItem("k", JSON.stringify(wrapVersioned("乱写的")));
    expect(loadVersionedScalar("k", isMode, "countup")).toBe("countup");
  });

  it("键不存在或 JSON 坏了时回落默认值", () => {
    expect(loadVersionedScalar("missing", null, 25)).toBe(25);
    localStorage.setItem("bad", "{ 半截");
    expect(loadVersionedScalar("bad", null, 25)).toBe(25);
  });

  it("存的就是 false / 0 时照常返回，不被当成「没存」", () => {
    localStorage.setItem("k", JSON.stringify(wrapVersioned(false)));
    expect(loadVersionedScalar("k", null, true)).toBe(false);
  });
});

describe("unwrapVersioned", () => {
  it("只脱 { version:number, data } 这一层，别的对象原样返回", () => {
    expect(unwrapVersioned({ version: 1, data: [1] })).toEqual([1]);
    expect(unwrapVersioned({ version: "1", data: [1] })).toEqual({ version: "1", data: [1] });
    expect(unwrapVersioned({ version: 1 })).toEqual({ version: 1 });
    expect(unwrapVersioned([1, 2])).toEqual([1, 2]);
    expect(unwrapVersioned(null)).toBe(null);
  });
});
