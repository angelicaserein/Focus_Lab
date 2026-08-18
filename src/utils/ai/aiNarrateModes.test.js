import { describe, it, expect, beforeEach, vi } from "vitest";

// 三个人设入口（旅程旁白 / 厂长播报 / 暖光陪伴）共用一个运行器。
// 旁白是「锦上添花」层：任何一条岔路都必须落到本地模板上，UI 永远有话说。
// 本地模板本身已在 aiNarrate.test.js 覆盖，这里只钉分流与兜底。
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

const { narrateJourney, narrateForeman, narrateLumi } = await import("@/utils/ai/aiNarrate");

const ctx = { stageText: "老手", momentumText: "渐入佳境", sessionCount: 5 };

beforeEach(() => {
  shell.chatComplete.mockReset();
  shell.postProxy.mockReset();
  shell.isProd = false;
  shell.hasKey = true;
});

describe("旁白的三模式分流", () => {
  it("生产环境走 /api/narrate，并带上人设名", async () => {
    shell.isProd = true;
    shell.postProxy.mockResolvedValue({ result: "你已走到老手这一段。" });

    const out = await narrateJourney(ctx, { lang: "zh" });

    const [endpoint, body] = shell.postProxy.mock.calls[0];
    expect(endpoint).toBe("/api/narrate");
    expect(body).toEqual({ context: ctx, lang: "zh", persona: "journey" });
    expect(out).toEqual({ text: "你已走到老手这一段。", source: "ai" });
  });

  it("本地有 key 时直连 SDK，每个人设用自己的 system 与 token 预算", async () => {
    shell.chatComplete.mockResolvedValue("播报完毕。");

    await narrateForeman({ tierName: "三级" }, { lang: "zh" });
    const foreman = shell.chatComplete.mock.calls[0][0];

    shell.chatComplete.mockClear();
    await narrateLumi({ mood: "sleepy" }, { lang: "zh" });
    const lumi = shell.chatComplete.mock.calls[0][0];

    expect(foreman.system).not.toBe(lumi.system);
    // 暖光只说一句话，预算比厂长播报更小
    expect(lumi.maxTokens).toBeLessThan(foreman.maxTokens);
  });

  it("无 key 时用本地模板，标成 local", async () => {
    shell.hasKey = false;

    const out = await narrateJourney(ctx, { lang: "zh" });

    expect(out.source).toBe("local");
    expect(out.text.length).toBeGreaterThan(0);
    expect(shell.postProxy).not.toHaveBeenCalled();
    expect(shell.chatComplete).not.toHaveBeenCalled();
  });

  it("代理 / SDK 报错都回退本地模板，界面上不会空一块", async () => {
    shell.isProd = true;
    shell.postProxy.mockRejectedValue(new Error("HTTP 503"));
    expect((await narrateJourney(ctx)).source).toBe("local");

    shell.isProd = false;
    shell.chatComplete.mockRejectedValue(new Error("boom"));
    expect((await narrateJourney(ctx)).source).toBe("local");
  });

  it("模型回了空白也算没答上来，退回本地模板", async () => {
    shell.chatComplete.mockResolvedValue("   ");

    const out = await narrateJourney(ctx);

    expect(out.source).toBe("local");
    expect(out.text.trim().length).toBeGreaterThan(0);
  });

  it("剥掉模型多带的引号与代码围栏", async () => {
    shell.chatComplete.mockResolvedValue('```\n「你已走到老手这一段。」\n```');

    const out = await narrateJourney(ctx);

    expect(out.text).toBe("你已走到老手这一段。");
    expect(out.source).toBe("ai");
  });

  it("variant 换一段：同一份数据换个号就换措辞", async () => {
    shell.hasKey = false;

    const a = await narrateJourney(ctx, { lang: "zh", variant: 0 });
    const b = await narrateJourney(ctx, { lang: "zh", variant: 1 });

    expect(b.text).not.toBe(a.text);
  });
});
