import { describe, it, expect } from "vitest";
import {
  buildQueryFields,
  opsForType,
  defaultOpFor,
  applyFilter,
  applySort,
  applyQuery,
  isEmptyVal,
} from "@/pages/Tasks/taskQuery";

// 取自 taskAttrDefaults.js 的列形状（优先级带 sortWeight）。
const ATTRS = [
  {
    id: "priority", name: "优先级", type: "select",
    options: [
      { id: "urgent", label: "紧急", color: "#ef4444", sortWeight: 4 },
      { id: "high",   label: "高",   color: "#f97316", sortWeight: 3 },
      { id: "medium", label: "中",   color: "#3b82f6", sortWeight: 2 },
      { id: "low",    label: "低",   color: "#9ca3af", sortWeight: 1 },
    ],
  },
  {
    id: "tags", name: "标签", type: "multiselect",
    options: [
      { id: "deep_work", label: "深度工作" },
      { id: "admin",     label: "杂务" },
      { id: "study",     label: "学习" },
    ],
  },
  { id: "dueDate", name: "截止日期", type: "date" },
  { id: "estimatedMins", name: "预计时长", type: "number", unit: "分" },
  { id: "notes", name: "备注", type: "text" },
];

const FIELDS = buildQueryFields(ATTRS);
const fieldMap = Object.fromEntries(FIELDS.map(f => [f.key, f]));

const todo = (id, attrs = {}, extra = {}) =>
  ({ id, text: id, completed: false, createdAt: 1000, attrs, ...extra });

const ids = (list) => list.map(t => t.id);

describe("buildQueryFields", () => {
  it("内置字段在前，随后是各列", () => {
    expect(FIELDS.slice(0, 3).map(f => f.key)).toEqual(["name", "status", "createdAt"]);
    expect(FIELDS.map(f => f.key)).toContain("priority");
  });
});

describe("opsForType / defaultOpFor（精简运算符）", () => {
  it("每种类型的默认运算符", () => {
    expect(defaultOpFor({ type: "text" })).toBe("contains");
    expect(defaultOpFor({ type: "select" })).toBe("is_any_of");
    expect(defaultOpFor({ type: "multiselect" })).toBe("has_any_of");
    expect(defaultOpFor({ type: "date" })).toBe("before");
    expect(defaultOpFor({ type: "number" })).toBe("eq");
  });
  it("每种类型都带 为空/不为空", () => {
    for (const type of ["text", "select", "multiselect", "date", "number"]) {
      const ids = opsForType(type).map(o => o.id);
      expect(ids).toContain("is_empty");
      expect(ids).toContain("is_not_empty");
    }
  });
});

describe("isEmptyVal", () => {
  it("空字符串/undefined/空数组为空；0 与非空数组不为空", () => {
    expect(isEmptyVal("")).toBe(true);
    expect(isEmptyVal(undefined)).toBe(true);
    expect(isEmptyVal([])).toBe(true);
    expect(isEmptyVal(0)).toBe(false);
    expect(isEmptyVal(["a"])).toBe(false);
  });
});

describe("applyFilter - 单规则", () => {
  const todos = [
    todo("a", { priority: "urgent", tags: ["deep_work"], notes: "写论文" }),
    todo("b", { priority: "low", tags: ["admin"] }),
    todo("c", {}),
  ];
  const f = (rule) => ids(applyFilter(todos, { conjunction: "and", rules: [{ id: "r", ...rule }] }, fieldMap));

  it("select 是其一", () => {
    expect(f({ field: "priority", op: "is_any_of", value: ["urgent", "high"] })).toEqual(["a"]);
  });
  it("multiselect 含其一", () => {
    expect(f({ field: "tags", op: "has_any_of", value: ["admin"] })).toEqual(["b"]);
  });
  it("text 包含（大小写不敏感）", () => {
    expect(f({ field: "notes", op: "contains", value: "论文" })).toEqual(["a"]);
  });
  it("为空 / 不为空", () => {
    expect(f({ field: "priority", op: "is_empty" })).toEqual(["c"]);
    expect(f({ field: "priority", op: "is_not_empty" })).toEqual(["a", "b"]);
  });
  it("status 内置字段", () => {
    const withDone = [...todos, todo("d", {}, { completed: true })];
    const out = applyFilter(withDone, { conjunction: "and", rules: [{ id: "r", field: "status", op: "is_any_of", value: ["completed"] }] }, fieldMap);
    expect(ids(out)).toEqual(["d"]);
  });
  it("未填值的规则被忽略（返回全部）", () => {
    expect(f({ field: "notes", op: "contains", value: "" })).toEqual(["a", "b", "c"]);
  });
});

describe("applyFilter - 且/或", () => {
  const todos = [
    todo("a", { priority: "urgent", tags: ["deep_work"] }),
    todo("b", { priority: "urgent", tags: ["admin"] }),
    todo("c", { priority: "low", tags: ["deep_work"] }),
  ];
  const rules = [
    { id: "1", field: "priority", op: "is_any_of", value: ["urgent"] },
    { id: "2", field: "tags", op: "has_any_of", value: ["deep_work"] },
  ];
  it("and 全部满足", () => {
    expect(ids(applyFilter(todos, { conjunction: "and", rules }, fieldMap))).toEqual(["a"]);
  });
  it("or 任一满足", () => {
    expect(ids(applyFilter(todos, { conjunction: "or", rules }, fieldMap))).toEqual(["a", "b", "c"]);
  });
});

describe("applyFilter - 日期与数字", () => {
  const todos = [
    todo("a", { dueDate: "2026-07-01", estimatedMins: 10 }),
    todo("b", { dueDate: "2026-07-10", estimatedMins: 60 }),
    todo("c", {}),
  ];
  const f = (rule) => ids(applyFilter(todos, { conjunction: "and", rules: [{ id: "r", ...rule }] }, fieldMap));
  it("日期 早于/晚于", () => {
    expect(f({ field: "dueDate", op: "before", value: "2026-07-05" })).toEqual(["a"]);
    expect(f({ field: "dueDate", op: "after", value: "2026-07-05" })).toEqual(["b"]);
  });
  it("数字 >/<", () => {
    expect(f({ field: "estimatedMins", op: "gt", value: 30 })).toEqual(["b"]);
    expect(f({ field: "estimatedMins", op: "lt", value: 30 })).toEqual(["a"]);
  });
});

describe("applySort", () => {
  it("select 按 sortWeight（升序 低→高），空值恒最后", () => {
    const todos = [
      todo("mid", { priority: "medium" }),
      todo("none", {}),
      todo("urgent", { priority: "urgent" }),
      todo("low", { priority: "low" }),
    ];
    const asc = ids(applySort(todos, [{ field: "priority", dir: "asc" }], fieldMap));
    expect(asc).toEqual(["low", "mid", "urgent", "none"]);
    const desc = ids(applySort(todos, [{ field: "priority", dir: "desc" }], fieldMap));
    expect(desc).toEqual(["urgent", "mid", "low", "none"]);
  });

  it("多级排序：先优先级降序，再截止日期升序", () => {
    const todos = [
      todo("a", { priority: "high", dueDate: "2026-07-10" }),
      todo("b", { priority: "high", dueDate: "2026-07-01" }),
      todo("c", { priority: "low", dueDate: "2026-07-01" }),
    ];
    const out = ids(applySort(todos, [
      { field: "priority", dir: "desc" },
      { field: "dueDate", dir: "asc" },
    ], fieldMap));
    expect(out).toEqual(["b", "a", "c"]);
  });

  it("稳定：无排序时保持原序", () => {
    const todos = [todo("x"), todo("y"), todo("z")];
    expect(ids(applySort(todos, [], fieldMap))).toEqual(["x", "y", "z"]);
  });
});

describe("applyQuery - 组合", () => {
  const todos = [
    todo("a", { priority: "urgent", notes: "复习" }),
    todo("b", { priority: "low", notes: "买菜" }),
    todo("c", { priority: "high", notes: "复习计划" }),
  ];
  it("搜索命中任务名或文本列，再按筛选/排序", () => {
    const out = applyQuery(todos, {
      search: "复习",
      filter: { conjunction: "and", rules: [] },
      sorts: [{ field: "priority", dir: "desc" }],
    }, FIELDS);
    expect(ids(out)).toEqual(["a", "c"]);
  });
});
