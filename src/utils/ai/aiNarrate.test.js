import { describe, it, expect } from "vitest";
import {
  localNarration,
  localForeman,
  localLumi,
  buildSystemPrompt,
  buildUserPayload,
  buildForemanSystem,
  buildForemanPayload,
  buildLumiSystem,
  buildLumiPayload,
} from "@/utils/ai/aiNarrate";

// 只测「无 key 本地兜底」的纯模板函数——AI 分支涉及网络，按仓库惯例不做单测。

describe("localNarration（旅程旁白·本地兜底）", () => {
  const active = {
    stageText: "老手",
    momentumText: "渐入佳境",
    topSkillName: "论文写作",
    unmetAchTitle: "马拉松",
    sessionCount: 5,
  };

  it("新用户（无会话）返回非空开场白", () => {
    const text = localNarration({ sessionCount: 0 }, "zh", 0);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("活跃用户会自然带入阶段 / 最投入方向 / 临近成就", () => {
    const text = localNarration(active, "zh", 0);
    expect(text).toContain("老手");
    expect(text).toContain("论文写作");
    expect(text).toContain("马拉松");
  });

  it("同参数确定性输出（refresh 才变）", () => {
    expect(localNarration(active, "zh", 0)).toBe(localNarration(active, "zh", 0));
  });

  it("不同 variant 产出不同文案", () => {
    expect(localNarration(active, "zh", 0)).not.toBe(localNarration(active, "zh", 1));
  });

  it("缺省字段不抛错；英文返回英文", () => {
    expect(() => localNarration({}, "en", 0)).not.toThrow();
    const en = localNarration(active, "en", 0);
    expect(en).toContain("老手"); // stageText 原样带入
    expect(/[a-z]/.test(en)).toBe(true);
  });
});

describe("localForeman（厂长播报·本地兜底）", () => {
  const running = {
    tierName: "作业区",
    topLineName: "采矿 · 专注时长",
    totalIp: 486,
    todayIp: 75,
    running: true,
  };

  it("运转中：带入工厂规模与主力产线", () => {
    const text = localForeman(running, "zh", 0);
    expect(text).toContain("作业区");
    expect(text).toContain("采矿 · 专注时长");
  });

  it("待开工：返回非空待命播报", () => {
    const text = localForeman({ running: false }, "zh", 0);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("确定性输出，且不同 variant 不同", () => {
    expect(localForeman(running, "zh", 0)).toBe(localForeman(running, "zh", 0));
    expect(localForeman(running, "zh", 0)).not.toBe(localForeman(running, "zh", 1));
  });
});

describe("localLumi（暖光陪伴·本地兜底）", () => {
  it("专注心情带入情景名", () => {
    const text = localLumi({ mood: "focus", scenarioName: "论文写作" }, "zh", 0);
    expect(text).toContain("论文写作");
  });

  it("四种心情都返回非空短句；未知心情回退 idle", () => {
    for (const mood of ["idle", "focus", "cheer", "sleepy", "??"]) {
      const text = localLumi({ mood }, "zh", 0);
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("确定性输出，且不同 variant 不同", () => {
    const ctx = { mood: "idle" };
    expect(localLumi(ctx, "zh", 0)).toBe(localLumi(ctx, "zh", 0));
    expect(localLumi(ctx, "zh", 0)).not.toBe(localLumi(ctx, "zh", 1));
  });

  it("英文返回英文", () => {
    const en = localLumi({ mood: "cheer" }, "en", 0);
    expect(/[a-z]/.test(en)).toBe(true);
  });
});

describe("prompt / payload 构建（发给模型的文本）", () => {
  const journeyCtx = {
    rankName: "老手",
    stageText: "Adept",
    momentumText: "Finding a rhythm",
    totalMins: 250,
    sessionCount: 8,
    streak: 4,
    topSkillName: "论文写作",
    unmetAchTitle: "Marathon",
  };
  const foremanCtx = { tierName: "作业区", totalIp: 486, todayIp: 75, topLineName: "采矿", running: true };

  it("系统提示按语言切换人设措辞", () => {
    expect(buildSystemPrompt("zh")).toContain("说书人");
    expect(buildSystemPrompt("en")).toContain("Narrator");
    expect(buildForemanSystem("zh")).toContain("厂长");
    expect(buildForemanSystem("en")).toContain("Foreman");
    expect(buildLumiSystem("zh")).toContain("暖光");
    expect(buildLumiSystem("en")).toContain("lamp-light");
  });

  it("暖光 payload 带入情境；可选字段缺省时省略", () => {
    const full = buildLumiPayload({ mood: "focus", taskCount: 2, scenarioName: "写作" }, "zh");
    expect(full).toContain("写作");
    expect(full).toContain("2");
    const bare = buildLumiPayload({ mood: "idle" }, "en");
    expect(bare).not.toMatch(/Tasks chosen/);
    expect(bare).not.toMatch(/Scenario/);
  });

  it("旅程 payload 带入事实；缺省的可选字段不出现", () => {
    const zh = buildUserPayload(journeyCtx, "zh");
    expect(zh).toContain("Adept");
    expect(zh).toContain("论文写作");
    expect(zh).toContain("Marathon");
    // 不传最投入方向 / 成就 → 对应行省略
    const bare = buildUserPayload({ rankName: "x" }, "en");
    expect(bare).not.toMatch(/Strongest focus/);
    expect(bare).not.toMatch(/achievement drawing near/);
  });

  it("厂长 payload 含规模与运转状态（中英各一套）", () => {
    expect(buildForemanPayload(foremanCtx, "zh")).toContain("运转中");
    expect(buildForemanPayload({ running: false }, "en")).toContain("idle");
  });
});
