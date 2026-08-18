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

const { generateTonePack } = await import("@/utils/ai/aiTone");
const { TONE_SLOTS } = await import("@/utils/ai/tonePack");

// 一份「全合法」的模型输出：每个槽位都给，带占位符的原样保留
const fullPhrases = Object.fromEntries(
  TONE_SLOTS.map((s) => [s.key, s.placeholder ? `喵 ${s.placeholder}` : "喵"]),
);

beforeEach(() => {
  shell.chatComplete.mockReset();
  shell.postProxy.mockReset();
  shell.isProd = false;
  shell.hasKey = true;
});

describe("generateTonePack", () => {
  it("没写语气就直接抛错，不白跑一次调用", async () => {
    await expect(generateTonePack("  ")).rejects.toThrow();
    expect(shell.postProxy).not.toHaveBeenCalled();
    expect(shell.chatComplete).not.toHaveBeenCalled();
  });

  it("本地无 key 时给示例语气包，并标成 example", async () => {
    shell.hasKey = false;

    const pack = await generateTonePack("像只猫", "zh");

    expect(pack.mode).toBe("example");
    expect(Object.keys(pack.phrases).length).toBeGreaterThan(0);
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("生产环境走 /api/tone 代理，把 system/user 一并交给服务端", async () => {
    shell.isProd = true;
    shell.postProxy.mockResolvedValue({ phrases: fullPhrases });

    const pack = await generateTonePack("像只猫", "zh");

    const [endpoint, body] = shell.postProxy.mock.calls[0];
    expect(endpoint).toBe("/api/tone");
    expect(body).toMatchObject({ tone: "像只猫", lang: "zh" });
    expect(body.user).toContain("像只猫");
    expect(pack.mode).toBe("ai");
    expect(pack.phrases[TONE_SLOTS[0].key]).toBe("喵");
  });

  it("本地有 key 时直连 SDK，并从模型文本里取 JSON", async () => {
    shell.chatComplete.mockResolvedValue("```json\n" + JSON.stringify(fullPhrases) + "\n```");

    const pack = await generateTonePack("像只猫", "zh");

    expect(pack.mode).toBe("ai");
    expect(pack.phrases[TONE_SLOTS[0].key]).toBe("喵");
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("代理报错时回退示例，而不是把错抛到界面上", async () => {
    shell.isProd = true;
    shell.postProxy.mockRejectedValue(new Error("HTTP 503"));

    const pack = await generateTonePack("像只猫", "zh");

    expect(pack.mode).toBe("example");
  });

  it("SDK 报错时同样回退示例", async () => {
    shell.chatComplete.mockRejectedValue(new Error("boom"));

    expect((await generateTonePack("像只猫", "zh")).mode).toBe("example");
  });

  it("模型答非所问（清洗后一个槽位都不剩）也回退示例，不给一套空文案", async () => {
    shell.chatComplete.mockResolvedValue('{"不认识的键":"随便"}');

    expect((await generateTonePack("像只猫", "zh")).mode).toBe("example");

    shell.isProd = true;
    shell.postProxy.mockResolvedValue({ phrases: {} });
    expect((await generateTonePack("像只猫", "zh")).mode).toBe("example");
  });

  it("丢了占位符的那一条被清掉——占位符里装的是等级/次数这类实时数字", async () => {
    const withPlaceholder = TONE_SLOTS.find((s) => s.placeholder);
    if (!withPlaceholder) return;
    shell.chatComplete.mockResolvedValue(
      JSON.stringify({ ...fullPhrases, [withPlaceholder.key]: "喵喵喵" }),
    );

    const pack = await generateTonePack("像只猫", "zh");

    expect(pack.mode).toBe("ai");
    expect(pack.phrases).not.toHaveProperty(withPlaceholder.key);
  });
});
