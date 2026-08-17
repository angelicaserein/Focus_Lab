import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPLIT_PREFS,
  buildRulesHint,
  normalizeSplitPrefs,
} from "@/utils/ai/taskSplitPrefs";

describe("normalizeSplitPrefs", () => {
  it("空/脏输入退回默认值，而不是把脏值拼进 prompt", () => {
    expect(normalizeSplitPrefs(null)).toEqual(DEFAULT_SPLIT_PREFS);
    expect(normalizeSplitPrefs({ granularity: "超细", askFirst: "yes", customRules: 42 })).toEqual(
      DEFAULT_SPLIT_PREFS,
    );
  });

  it("自定义规矩截到 800 字，免得撑爆 prompt", () => {
    const long = "拆".repeat(1200);
    expect(normalizeSplitPrefs({ customRules: long }).customRules).toHaveLength(800);
  });
});

describe("buildRulesHint", () => {
  it("三档粒度给出各自的指令，且都不含「宁可少拆」", () => {
    const coarse = buildRulesHint({ granularity: "coarse" });
    const fine = buildRulesHint({ granularity: "fine" });
    expect(coarse).toContain("不要再往下拆步骤");
    expect(fine).toContain("3–6 条");
    expect(coarse).not.toContain("宁可少拆");
    expect(fine).not.toContain("宁可少拆");
  });

  it("默认不猜日期，开了才允许推", () => {
    expect(buildRulesHint(DEFAULT_SPLIT_PREFS)).toContain("别靠语气猜");
    expect(buildRulesHint({ ...DEFAULT_SPLIT_PREFS, guessDates: true })).toContain("可以按今天推");
  });

  it("自定义规矩原样附在后面，并声明优先级更高", () => {
    const hint = buildRulesHint({ ...DEFAULT_SPLIT_PREFS, customRules: "课业类优先排" });
    expect(hint).toContain("课业类优先排");
    expect(hint).toContain("优先级高于上面的粒度规则");
  });

  it("空白的自定义规矩不产生空段落", () => {
    expect(buildRulesHint({ ...DEFAULT_SPLIT_PREFS, customRules: "   " })).not.toContain("规矩");
  });

  it("反问答案接在末尾；没答的条目被丢掉", () => {
    const hint = buildRulesHint(DEFAULT_SPLIT_PREFS, [
      { question: "作业三要拆吗？", answer: "拆到最细" },
      { question: "没答的", answer: "" },
    ]);
    expect(hint).toContain("- 作业三要拆吗？ → 拆到最细");
    expect(hint).not.toContain("没答的");
  });
});
