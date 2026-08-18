import { describe, it, expect, beforeEach, vi } from "vitest";

// 底座换桩，只留真的 extractJson（见 aiTasksModes.test.js 里的同款说明）。
const shell = vi.hoisted(() => ({
  isProd: false,
  hasKey: true,
  chatComplete: vi.fn(),
  postProxy: vi.fn(),
}));

vi.mock("@/utils/ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    get IS_PROD() { return shell.isProd; },
    hasApiKey: () => shell.hasKey,
    delay: () => Promise.resolve(),
    chatComplete: shell.chatComplete,
    postProxy: shell.postProxy,
  };
});

const {
  parseAssignJson,
  buildUserPayload,
  buildSystemPrompt,
  assignMatrixPositions,
} = await import("@/utils/ai/aiMatrixAssign");

beforeEach(() => {
  shell.chatComplete.mockReset();
  shell.postProxy.mockReset();
  shell.isProd = false;
  shell.hasKey = true;
});

describe("parseAssignJson", () => {
  it("解析 positions 包装，数值原样保留", () => {
    const raw = '{"positions":{"t1":{"urgency":0.8,"importance":0.3}}}';
    expect(parseAssignJson(raw)).toEqual({ positions: { t1: { urgency: 0.8, importance: 0.3 } } });
  });

  it("模型漏掉 positions 外层时按裸对象读", () => {
    const raw = '{"t1":{"urgency":0.2,"importance":0.9}}';
    expect(parseAssignJson(raw).positions.t1).toEqual({ urgency: 0.2, importance: 0.9 });
  });

  it("越界数值夹回 0..1——否则任务会被摆到矩阵画布外面，界面上就是「AI 分完少了几条」", () => {
    const raw = '{"positions":{"a":{"urgency":1.7,"importance":-0.4}}}';
    expect(parseAssignJson(raw).positions.a).toEqual({ urgency: 1, importance: 0 });
  });

  it("数值缺失 / 非数字 / 非对象的条目整条丢掉，不影响同批其它任务", () => {
    const raw = JSON.stringify({
      positions: {
        good: { urgency: 0.5, importance: 0.5 },
        noNum: { urgency: "很急", importance: 0.5 },
        half: { urgency: 0.5 },
        notObj: 3,
        nul: null,
      },
    });
    expect(Object.keys(parseAssignJson(raw).positions)).toEqual(["good"]);
  });

  it("剥代码围栏，非法输入兜底空结果", () => {
    expect(parseAssignJson('```json\n{"positions":{"a":{"urgency":0.1,"importance":0.1}}}\n```').positions.a)
      .toEqual({ urgency: 0.1, importance: 0.1 });
    expect(parseAssignJson("模型今天不想输出 JSON")).toEqual({ positions: {} });
    expect(parseAssignJson(null)).toEqual({ positions: {} });
  });

  it("接受已解析好的对象", () => {
    expect(parseAssignJson({ positions: { a: { urgency: 0, importance: 1 } } }).positions.a)
      .toEqual({ urgency: 0, importance: 1 });
    // 数组不是合法形状
    expect(parseAssignJson([{ urgency: 1 }])).toEqual({ positions: {} });
  });
});

describe("buildUserPayload", () => {
  it("每条任务一行，带上 id 和已有属性", () => {
    const text = buildUserPayload([
      { id: "t1", text: "写论文", attrs: { priority: "important", tags: ["project"], dueDate: "2026-09-01" } },
    ]);
    expect(text).toContain("id=t1｜写论文");
    expect(text).toContain("优先级=important");
    expect(text).toContain("标签=project");
    expect(text).toContain("截止=2026-09-01");
  });

  it("没有属性的任务不拖一条空竖线，空标签数组也不出现", () => {
    expect(buildUserPayload([{ id: "t1", text: "买菜" }])).toContain("- id=t1｜买菜");
    expect(buildUserPayload([{ id: "t1", text: "买菜" }])).not.toContain("｜｜");
    expect(buildUserPayload([{ id: "t1", text: "买菜", attrs: { tags: [] } }])).not.toContain("标签=");
  });

  it("预计时长不进 payload——矩阵两轴是紧急/重要，工时多少不该把任务推向任何一角", () => {
    const text = buildUserPayload([{ id: "t1", text: "x", attrs: { estimatedMins: 90 } }]);
    expect(text).toBe("未分类任务：\n- id=t1｜x");
  });
});

describe("assignMatrixPositions", () => {
  it("没有任务时直接返回空结果", async () => {
    expect(await assignMatrixPositions([])).toEqual({ positions: {} });
    expect(await assignMatrixPositions(undefined)).toEqual({ positions: {} });
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("生产环境走 /api/assign-matrix 代理", async () => {
    shell.isProd = true;
    shell.postProxy.mockResolvedValue({ result: '{"positions":{"t1":{"urgency":0.9,"importance":0.9}}}' });

    const out = await assignMatrixPositions([{ id: "t1", text: "交表" }]);

    expect(shell.postProxy.mock.calls[0][0]).toBe("/api/assign-matrix");
    expect(out.positions.t1).toEqual({ urgency: 0.9, importance: 0.9 });
    expect(shell.chatComplete).not.toHaveBeenCalled();
  });

  it("本地有 key 时直连 SDK，token 预算随任务数增长", async () => {
    shell.chatComplete.mockResolvedValue('{"positions":{}}');

    await assignMatrixPositions([{ id: "a", text: "一" }]);
    const small = shell.chatComplete.mock.calls[0][0].maxTokens;

    shell.chatComplete.mockClear();
    await assignMatrixPositions(Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, text: "x" })));
    const big = shell.chatComplete.mock.calls[0][0].maxTokens;

    // 预算不够会把 JSON 截断成空，整批分类静默失败
    expect(big).toBeGreaterThan(small);
    expect(big).toBeLessThanOrEqual(4096);
    expect(shell.chatComplete.mock.calls[0][0].system).toBe(buildSystemPrompt());
  });

  it("本地无 key 时按已有优先级粗估一版，每条任务都要有落点", async () => {
    shell.hasKey = false;

    const { positions } = await assignMatrixPositions([
      { id: "a", text: "急且重要", attrs: { priority: "urgent_important" } },
      { id: "b", text: "没线索" },
    ]);

    expect(Object.keys(positions)).toEqual(["a", "b"]);
    expect(positions.a.importance).toBeGreaterThan(positions.b.importance);
    expect(shell.chatComplete).not.toHaveBeenCalled();
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("离线粗估里有截止日期的更紧急，且不会被顶出 0..1", async () => {
    shell.hasKey = false;

    const { positions } = await assignMatrixPositions([
      { id: "a", text: "有死期", attrs: { priority: "urgent_important", dueDate: "2026-09-01" } },
      { id: "b", text: "没死期", attrs: { priority: "urgent_important" } },
    ]);

    expect(positions.a.urgency).toBeGreaterThan(positions.b.urgency);
    expect(positions.a.urgency).toBeLessThanOrEqual(1);
  });
});
