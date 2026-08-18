import { describe, it, expect, beforeEach, vi } from "vitest";

// 底座换桩（见 aiTasksModes.test.js 里的同款说明）。
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

const { parseRecommendJson, buildUserPayload, rerankRecommendations } =
  await import("@/utils/ai/aiRecommend");

const candidates = [
  { id: "a", text: "写论文", attrs: { priority: "important", tags: ["project"], dueDate: "2026-09-01" } },
  { id: "b", text: "洗碗" },
];

beforeEach(() => {
  shell.chatComplete.mockReset();
  shell.postProxy.mockReset();
  shell.isProd = false;
  shell.hasKey = true;
});

describe("parseRecommendJson", () => {
  it("解析重排与理由", () => {
    const raw = '{"order":["b","a"],"reasons":{"b":"手边就能做"}}';
    expect(parseRecommendJson(raw)).toEqual({ order: ["b", "a"], reasons: { b: "手边就能做" } });
  });

  it("order 里的非字符串项剔掉，缺 order 时给空数组（调用方据此保留规则顺序）", () => {
    expect(parseRecommendJson('{"order":["a",3,null]}').order).toEqual(["a"]);
    expect(parseRecommendJson('{"reasons":{"a":"理由"}}').order).toEqual([]);
  });

  it("空白理由不算理由，两端空格去掉", () => {
    const { reasons } = parseRecommendJson('{"reasons":{"a":"  ","b":" 顺手 ","c":5}}');
    expect(reasons).toEqual({ b: "顺手" });
  });

  it("剥围栏；解析不出来时兜底成空结果", () => {
    expect(parseRecommendJson('```json\n{"order":["a"]}\n```').order).toEqual(["a"]);
    expect(parseRecommendJson("模型今天想聊天")).toEqual({ order: [], reasons: {} });
    expect(parseRecommendJson(["a"])).toEqual({ order: [], reasons: {} });
  });
});

describe("buildUserPayload", () => {
  it("把情景四要素和候选写进去", () => {
    const text = buildUserPayload(candidates, {
      scenario: { title: "图书馆", description: "不能说话", settings: { devices: ["笔记本"], communication: "禁止", taskTypes: ["project"] } },
      envProfile: { label: "长时段" },
    });
    expect(text).toContain("情景：图书馆（不能说话）");
    expect(text).toContain("设备：笔记本");
    expect(text).toContain("交流：禁止");
    expect(text).toContain("任务类型偏好：project");
    expect(text).toContain("环境时长偏好：长时段");
    expect(text).toContain("- id=a｜写论文｜优先级=important 标签=project 截止=2026-09-01");
  });

  it("情景没配全时写「未设置」，而不是留空让模型自己脑补", () => {
    const text = buildUserPayload(candidates, {});
    expect(text).toContain("情景：（未命名）");
    expect(text).toContain("设备：未设置");
    expect(text).toContain("交流：未设置");
    expect(text).toContain("环境时长偏好：无特别偏好");
  });
});

describe("rerankRecommendations", () => {
  it("没有候选时不调用任何后端", async () => {
    expect(await rerankRecommendations([])).toEqual({ order: [], reasons: {} });
    expect(await rerankRecommendations(undefined)).toEqual({ order: [], reasons: {} });
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("生产环境走 /api/recommend 代理", async () => {
    shell.isProd = true;
    shell.postProxy.mockResolvedValue({ result: '{"order":["b","a"]}' });

    const out = await rerankRecommendations(candidates, { scenario: { title: "家" } });

    expect(shell.postProxy.mock.calls[0][0]).toBe("/api/recommend");
    expect(out.order).toEqual(["b", "a"]);
    expect(shell.chatComplete).not.toHaveBeenCalled();
  });

  it("本地有 key 时直连 SDK", async () => {
    shell.chatComplete.mockResolvedValue('{"order":["a","b"],"reasons":{"a":"先啃硬的"}}');

    const out = await rerankRecommendations(candidates, { scenario: { title: "家" } });

    expect(out).toEqual({ order: ["a", "b"], reasons: { a: "先啃硬的" } });
    expect(shell.chatComplete.mock.calls[0][0].user).toContain("id=a");
  });

  it("无 key 时保持规则给的顺序，只给 Top1 套一句示例理由", async () => {
    shell.hasKey = false;

    const out = await rerankRecommendations(candidates, { lang: "zh" });

    // 精排是锦上添花：没有 AI 时必须原样退回规则顺序，不能重排也不能少条
    expect(out.order).toEqual(["a", "b"]);
    expect(Object.keys(out.reasons)).toEqual(["a"]);
    expect(out.reasons.a).toContain("示例");
  });

  it("离线示例理由跟随语言", async () => {
    shell.hasKey = false;

    const out = await rerankRecommendations(candidates, { lang: "en" });

    expect(out.reasons.a).toContain("Sample");
  });
});
