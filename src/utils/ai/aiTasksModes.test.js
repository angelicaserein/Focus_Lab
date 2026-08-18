import { describe, it, expect, beforeEach, vi } from "vitest";

// 三个入口（拆任务 / 反问 / 细化）的「三模式分流」：
//   1. 生产 → POST 自家 /api/* 代理（key 在服务器侧）
//   2. 本地 + 有 key → SDK 直连
//   3. 本地 + 无 key → 离线示例
// 分流走错不会报错，只会安静地走到另一条路上：生产环境漏调代理就是把 key 的活
// 塞给浏览器，本地没 key 却去发请求就是一片 401。所以这里把每条分支钉住。
//
// 底座（aiClient）整个换成桩，只留真的 extractJson——解析行为已在 aiTasks.test.js 覆盖。
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
  extractTasksFromText,
  askClarifyingQuestions,
  refineTask,
  buildClarifySystemPrompt,
  buildRefineSystemPrompt,
} = await import("@/utils/ai/aiTasks");
const { TASK_ATTR_DEFAULTS } = await import("@/utils/task/taskAttrDefaults");

const fullDb = { id: "d1", attrs: TASK_ATTR_DEFAULTS.map((a) => ({ ...a })) };
const emptyDb = { id: "d0", attrs: [] };

const asProd = () => { shell.isProd = true; shell.hasKey = true; };
const asDevWithKey = () => { shell.isProd = false; shell.hasKey = true; };
const asOffline = () => { shell.isProd = false; shell.hasKey = false; };

beforeEach(() => {
  shell.chatComplete.mockReset();
  shell.postProxy.mockReset();
  asDevWithKey();
});

describe("extractTasksFromText", () => {
  it("空输入直接返回空数组，不惊动任何后端", async () => {
    expect(await extractTasksFromText("   ", { database: fullDb })).toEqual([]);
    expect(shell.chatComplete).not.toHaveBeenCalled();
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("生产环境走 /api/extract-tasks 代理，不碰 SDK", async () => {
    asProd();
    shell.postProxy.mockResolvedValue({ tasks: '[{"text":"回邮件"}]' });

    const out = await extractTasksFromText("记得回邮件", { database: emptyDb });

    expect(out).toEqual([{ text: "回邮件", attrs: {} }]);
    const [endpoint, body] = shell.postProxy.mock.calls[0];
    expect(endpoint).toBe("/api/extract-tasks");
    expect(body.text).toBe("记得回邮件");
    // 「今天」必须在浏览器本地时区算好再发过去：代理跑在 UTC，让它自己算会差一天
    expect(body.today).toEqual(expect.objectContaining({ date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    expect(body.schemaHint).toContain("只有任务标题");
    expect(shell.chatComplete).not.toHaveBeenCalled();
  });

  it("本地有 key 时直连 SDK，system prompt 带上今天和列说明", async () => {
    shell.chatComplete.mockResolvedValue('[{"text":"写大纲","dueDate":"2026-09-01"}]');

    const out = await extractTasksFromText("下周一前写大纲", { database: fullDb });

    expect(out).toEqual([{ text: "写大纲", attrs: { dueDate: "2026-09-01" } }]);
    const { system, user } = shell.chatComplete.mock.calls[0][0];
    expect(system).toContain("今天是 ");
    expect(system).toContain("dueDate");
    expect(user).toBe("下周一前写大纲");
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("本地无 key 时给离线示例，不发任何请求", async () => {
    asOffline();

    const out = await extractTasksFromText("随便写点什么", { database: fullDb });

    expect(out.length).toBeGreaterThan(0);
    expect(out.every((t) => t.text.startsWith("示例："))).toBe(true);
    expect(shell.chatComplete).not.toHaveBeenCalled();
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("离线示例跟随输入语言", async () => {
    asOffline();

    const en = await extractTasksFromText("remember to reply", { database: emptyDb });

    expect(en.every((t) => t.text.startsWith("Sample:"))).toBe(true);
  });

  it("离线示例只填目标库真有的列，不给空库编字段", async () => {
    asOffline();

    const [t1, t2] = await extractTasksFromText("随便写点什么", { database: emptyDb });

    expect(t1.attrs).toEqual({});
    expect(t2.attrs).toEqual({});
  });
});

describe("askClarifyingQuestions", () => {
  it("空输入不反问", async () => {
    expect(await askClarifyingQuestions("")).toEqual([]);
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("生产环境走 /api/clarify-tasks", async () => {
    asProd();
    shell.postProxy.mockResolvedValue({
      questions: '[{"question":"要拆吗？","options":["拆","不拆"],"default":"拆"}]',
    });

    const out = await askClarifyingQuestions("一堆事");

    expect(shell.postProxy.mock.calls[0][0]).toBe("/api/clarify-tasks");
    expect(out).toEqual([{ question: "要拆吗？", options: ["拆", "不拆"], default: "拆" }]);
  });

  it("本地有 key 时直连 SDK 并解析成题目", async () => {
    shell.chatComplete.mockResolvedValue('[{"question":"要拆吗？","options":["拆","不拆"]}]');

    const out = await askClarifyingQuestions("一堆事");

    expect(out[0].default).toBe("拆");
    expect(shell.chatComplete.mock.calls[0][0].system).toContain("最多 3 题");
  });

  it("离线示例的默认答案必须在选项里——否则跳过反问就没有可用的答案", async () => {
    asOffline();

    const out = await askClarifyingQuestions("一堆事");

    expect(out.length).toBeGreaterThan(0);
    expect(out.every((q) => q.options.includes(q.default))).toBe(true);
  });
});

describe("refineTask", () => {
  it("没有 text 的任务不拆", async () => {
    expect(await refineTask({ text: "  " })).toEqual([]);
    expect(await refineTask(undefined)).toEqual([]);
    expect(shell.chatComplete).not.toHaveBeenCalled();
  });

  it("生产环境走 /api/refine-task，并把原任务的属性一并带上供子任务继承", async () => {
    asProd();
    shell.postProxy.mockResolvedValue({ tasks: '[{"text":"打开文件"},{"text":"列三点"}]' });

    const out = await refineTask(
      { text: "写统计课作业三", attrs: { dueDate: "2026-09-01" } },
      { database: fullDb },
    );

    const [endpoint, body] = shell.postProxy.mock.calls[0];
    expect(endpoint).toBe("/api/refine-task");
    expect(body.task).toEqual({ text: "写统计课作业三", attrs: { dueDate: "2026-09-01" } });
    expect(out.map((t) => t.text)).toEqual(["打开文件", "列三点"]);
  });

  it("本地有 key 时把「任务 + 属性」作为 JSON 交给 SDK", async () => {
    shell.chatComplete.mockResolvedValue("[]");

    await refineTask({ text: "写作业" }, { database: emptyDb });

    const { system, user } = shell.chatComplete.mock.calls[0][0];
    expect(JSON.parse(user)).toEqual({ text: "写作业", attrs: {} });
    expect(system).toContain("几乎不需要下决心");
  });

  it("离线示例引用原任务，让「拆开」这一步在没 key 时也看得出效果", async () => {
    asOffline();

    const out = await refineTask({ text: "写统计课作业三" });

    expect(out).toHaveLength(3);
    expect(out[0].text).toContain("写统计课作业三");
  });
});

describe("buildClarifySystemPrompt / buildRefineSystemPrompt", () => {
  const today = { date: "2026-08-14", weekday: "五" };

  it("都把今天写进 prompt", () => {
    expect(buildClarifySystemPrompt("", today)).toContain("今天是 2026-08-14（星期五）");
    expect(buildRefineSystemPrompt("", today)).toContain("今天是 2026-08-14（星期五）");
  });

  it("没有偏好时给出明确的占位，而不是留一段空白让模型自行发挥", () => {
    expect(buildClarifySystemPrompt("", today)).toContain("（无）");
    expect(buildRefineSystemPrompt("", today)).toContain("（无额外偏好）");
  });

  it("给了偏好就原样带进去", () => {
    expect(buildClarifySystemPrompt("粒度规则：\n- 拆到最细。", today)).toContain("- 拆到最细。");
    expect(buildRefineSystemPrompt("", today, "粒度规则：\n- 拆到最细。")).toContain("- 拆到最细。");
  });
});
