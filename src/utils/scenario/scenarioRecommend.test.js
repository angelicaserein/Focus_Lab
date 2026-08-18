import { describe, it, expect } from "vitest";
import {
  deriveEnvProfile,
  scoreTask,
  buildScenarioContext,
  recommendTasks,
} from "@/utils/scenario/scenarioRecommend";
import { parseRecommendJson } from "@/utils/ai/aiRecommend";

// 固定参考时间：2026-06-30（与项目当前日期一致）。
const NOW = new Date("2026-06-30T09:00:00").getTime();

// 模拟 priority 列定义（取自 taskAttrDefaults.js 的形状）。
const PRIORITY_ATTR = {
  id: "priority",
  options: [
    { id: "urgent", label: "紧急", sortWeight: 4 },
    { id: "high", label: "高", sortWeight: 3 },
    { id: "medium", label: "中", sortWeight: 2 },
    { id: "low", label: "低", sortWeight: 1 },
  ],
};

// 便捷构造 ctx
const ctxFor = (settings) =>
  buildScenarioContext({ settings }, PRIORITY_ATTR);

const todo = (id, attrs = {}, extra = {}) => ({ id, text: id, completed: false, attrs, ...extra });

describe("deriveEnvProfile", () => {
  it("安静/只能文字 + 桌面类设备 → long", () => {
    expect(deriveEnvProfile({ communication: "silent", devices: ["computer"] }).preferredDuration).toBe("long");
    expect(deriveEnvProfile({ communication: "textonly", devices: ["paper"] }).preferredDuration).toBe("long");
  });

  it("仅手机 → short", () => {
    expect(deriveEnvProfile({ communication: "talking", devices: ["phone"] }).preferredDuration).toBe("short");
  });

  it("混合/信息不足/未知 ID → any", () => {
    expect(deriveEnvProfile({ communication: "talking", devices: ["computer"] }).preferredDuration).toBe("any");
    expect(deriveEnvProfile({ communication: "", devices: [] }).preferredDuration).toBe("any");
    // 未知自定义 ID 不应被误判
    expect(deriveEnvProfile({ communication: "custom_x", devices: ["custom_y"] }).preferredDuration).toBe("any");
  });

  it("安静但只带手机仍算 short（无桌面设备）", () => {
    expect(deriveEnvProfile({ communication: "silent", devices: ["phone"] }).preferredDuration).toBe("short");
  });
});

describe("scoreTask - taskType 匹配", () => {
  const ctx = ctxFor({ taskTypes: ["deep_work"], communication: "", devices: [] });

  it("标签命中情景任务类型 → 加分且给理由", () => {
    const r = scoreTask(todo("a", { tags: ["deep_work"] }), ctx, NOW);
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.some((x) => x.key === "tag")).toBe(true);
  });

  it("有标签但不命中 → 扣分", () => {
    const r = scoreTask(todo("b", { tags: ["admin"] }), ctx, NOW);
    expect(r.score).toBeLessThan(0);
  });

  it("无标签 → 中性（不加不扣）", () => {
    expect(scoreTask(todo("c", {}), ctx, NOW).score).toBe(0);
  });
});

describe("scoreTask - 优先级排序", () => {
  const ctx = ctxFor({ taskTypes: [], communication: "", devices: [] });
  it("优先级越高分越高", () => {
    const urgent = scoreTask(todo("u", { priority: "urgent" }), ctx, NOW).score;
    const low = scoreTask(todo("l", { priority: "low" }), ctx, NOW).score;
    expect(urgent).toBeGreaterThan(low);
  });
});

describe("scoreTask - 截止临近度分桶", () => {
  const ctx = ctxFor({ taskTypes: [], communication: "", devices: [] });
  const dueScore = (date) => scoreTask(todo("d", { dueDate: date }), ctx, NOW).score;

  it("逾期 > 今天 > ≤2天 > ≤7天 > 无", () => {
    const overdue = dueScore("2026-06-28");
    const today = dueScore("2026-06-30");
    const soon = dueScore("2026-07-01");
    const week = dueScore("2026-07-05");
    const far = dueScore("2026-12-31");
    const none = scoreTask(todo("d", {}), ctx, NOW).score;
    expect(overdue).toBeGreaterThan(today);
    expect(today).toBeGreaterThan(soon);
    expect(soon).toBeGreaterThan(week);
    expect(week).toBeGreaterThan(far);
    expect(far).toBe(none);
  });
});

describe("recommendTasks", () => {
  const ctx = ctxFor({ taskTypes: ["deep_work"], communication: "silent", devices: ["computer"] });

  it("按 score 降序并排除已完成", () => {
    const todos = [
      todo("done", { tags: ["deep_work"], priority: "urgent" }, { completed: true }),
      todo("plain", {}),
      todo("hit", { tags: ["deep_work"], priority: "high" }),
    ];
    const out = recommendTasks(todos, ctx, { now: NOW, limit: 5 });
    expect(out.map((x) => x.todo.id)).toEqual(["hit", "plain"]);
  });

  it("limit 截断", () => {
    const todos = [todo("a"), todo("b"), todo("c")];
    expect(recommendTasks(todos, ctx, { now: NOW, limit: 2 })).toHaveLength(2);
  });

  it("score 相等时保持输入相对顺序（稳定）", () => {
    const todos = [todo("x"), todo("y"), todo("z")];
    const out = recommendTasks(todos, ctx, { now: NOW });
    expect(out.map((x) => x.todo.id)).toEqual(["x", "y", "z"]);
  });
});

describe("parseRecommendJson", () => {
  it("解析裸 JSON 对象", () => {
    const r = parseRecommendJson('{"order":["a","b"],"reasons":{"a":"先做这个"}}');
    expect(r.order).toEqual(["a", "b"]);
    expect(r.reasons.a).toBe("先做这个");
  });

  it("剥代码围栏 + 容忍前后解释文字", () => {
    const raw = '好的，结果如下：\n```json\n{"order":["x"],"reasons":{}}\n```';
    expect(parseRecommendJson(raw).order).toEqual(["x"]);
  });

  it("直接接受已解析对象", () => {
    expect(parseRecommendJson({ order: ["a"], reasons: {} }).order).toEqual(["a"]);
  });

  it("非法输入兜底为空结果", () => {
    expect(parseRecommendJson("不是 JSON")).toEqual({ order: [], reasons: {} });
    expect(parseRecommendJson(null)).toEqual({ order: [], reasons: {} });
  });

  it("过滤非字符串 order 项与空理由", () => {
    const r = parseRecommendJson('{"order":["a",1,null],"reasons":{"a":"  ","b":"有效"}}');
    expect(r.order).toEqual(["a"]);
    expect(r.reasons).toEqual({ b: "有效" });
  });
});
