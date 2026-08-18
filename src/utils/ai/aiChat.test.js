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

const { getAiReply } = await import("@/utils/ai/aiChat");

const msgs = (...texts) => texts.map((text, i) => ({ role: i % 2 ? "ai" : "user", text }));

beforeEach(() => {
  shell.chatComplete.mockReset();
  shell.postProxy.mockReset();
  shell.isProd = false;
  shell.hasKey = true;
});

describe("getAiReply", () => {
  it("生产环境走 /api/chat，并把 UI 的 role 翻成 OpenAI 的 role", async () => {
    shell.isProd = true;
    shell.postProxy.mockResolvedValue({ text: "慢慢来" });

    const out = await getAiReply(msgs("我卡住了", "先深呼吸", "还是卡"), "zh");

    const [endpoint, body] = shell.postProxy.mock.calls[0];
    expect(endpoint).toBe("/api/chat");
    expect(body.messages).toEqual([
      { role: "user", content: "我卡住了" },
      { role: "assistant", content: "先深呼吸" },
      { role: "user", content: "还是卡" },
    ]);
    expect(body.lang).toBe("zh");
    expect(out).toBe("慢慢来");
  });

  it("本地有 key 时直连 SDK，system 提示词跟随语言", async () => {
    shell.chatComplete.mockResolvedValue("Take a breath");

    await getAiReply(msgs("stuck"), "en");

    const [{ messages }] = shell.chatComplete.mock.calls[0];
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("English");
    expect(messages[1]).toEqual({ role: "user", content: "stuck" });
  });

  it("无 key 时给示例回复，语言跟随 lang", async () => {
    shell.hasKey = false;

    const zh = await getAiReply(msgs("我卡住了"), "zh");
    const en = await getAiReply(msgs("stuck"), "en");

    expect(zh).toMatch(/[一-鿿]/);
    expect(en).not.toMatch(/[一-鿿]/);
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("示例回复随对话轮次轮换，不会一直重复同一句", async () => {
    shell.hasKey = false;

    const first = await getAiReply(msgs("一"), "zh");
    const second = await getAiReply(msgs("一", "回", "二"), "zh");

    expect(second).not.toBe(first);
  });

  it("未知语言回落中文示例，而不是给一句 undefined", async () => {
    shell.hasKey = false;

    expect(typeof await getAiReply(msgs("嗨"), "de")).toBe("string");
  });

  it("代理挂了就回退示例回复——陪伴对话不该在界面上留一条报错", async () => {
    shell.isProd = true;
    shell.postProxy.mockRejectedValue(new Error("HTTP 503"));

    const out = await getAiReply(msgs("我卡住了"), "zh");

    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  it("SDK 抛错时同样回退示例", async () => {
    shell.chatComplete.mockRejectedValue(new Error("boom"));

    expect(typeof await getAiReply(msgs("我卡住了"), "zh")).toBe("string");
  });
});
