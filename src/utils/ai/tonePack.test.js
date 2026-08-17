import { describe, it, expect } from "vitest";
import {
  TONE_SLOTS,
  TONE_SLOT_KEYS,
  SAMPLE_TONE_PACKS,
  sanitizeTonePhrases,
  makeToneT,
} from "@/utils/ai/tonePack";

// 语气包是 AI 直接生成的文案，会原样渲染进角色卡/结算卡。
// sanitize 是唯一一道闸：模型漏写占位符、返回对象/数字、少给几个槽位都不能崩，
// 只能安静回退到默认文案。下面的用例就是照着「模型能怎么写歪」列的。

// 极简 t()：认得出被调用时用了哪个 key，并做占位符插值
const fakeT = (key, vars) =>
  vars ? `${key}(${JSON.stringify(vars)})` : `default:${key}`;

const pack = (phrases, lang = "zh") => ({ lang, phrases });

describe("TONE_SLOTS", () => {
  it("槽位 key 不重复", () => {
    expect(new Set(TONE_SLOT_KEYS).size).toBe(TONE_SLOT_KEYS.length);
  });

  it("每个槽位都给了 desc（AI 靠它知道这句用在哪）", () => {
    const bad = TONE_SLOTS.filter((s) => !s.desc?.trim()).map((s) => s.key);
    expect(bad).toEqual([]);
  });

  it("TONE_SLOT_KEYS 与 TONE_SLOTS 同步", () => {
    expect(TONE_SLOT_KEYS).toEqual(TONE_SLOTS.map((s) => s.key));
  });
});

describe("SAMPLE_TONE_PACKS", () => {
  it("中英两份都覆盖了全部槽位 —— 无 key 时要能演示完整链路", () => {
    for (const lang of ["zh", "en"]) {
      const missing = TONE_SLOT_KEYS.filter((k) => !SAMPLE_TONE_PACKS[lang][k]);
      expect(missing, `${lang} 缺槽位`).toEqual([]);
    }
  });

  it("示例包自己能原样通过校验（别写出会被自己筛掉的样例）", () => {
    for (const lang of ["zh", "en"]) {
      expect(Object.keys(sanitizeTonePhrases(SAMPLE_TONE_PACKS[lang])).sort()).toEqual(
        [...TONE_SLOT_KEYS].sort(),
      );
    }
  });
});

describe("sanitizeTonePhrases", () => {
  it("非对象输入一律返回空表，不抛", () => {
    expect(sanitizeTonePhrases(null)).toEqual({});
    expect(sanitizeTonePhrases(undefined)).toEqual({});
    expect(sanitizeTonePhrases("nope")).toEqual({});
    expect(sanitizeTonePhrases(42)).toEqual({});
  });

  it("只收白名单里的槽位，模型自创的 key 丢掉", () => {
    const out = sanitizeTonePhrases({
      "character.stage.0": "新芽初绽",
      "character.made.up": "瞎编的",
    });
    expect(out).toEqual({ "character.stage.0": "新芽初绽" });
  });

  it("非字符串、空串、纯空白都不算数（回退默认文案）", () => {
    const out = sanitizeTonePhrases({
      "character.stage.0": "",
      "character.stage.1": "   ",
      "character.stage.2": 123,
      "character.stage.3": { text: "对象" },
      "character.stage.4": null,
    });
    expect(out).toEqual({});
  });

  it("收下的文案去掉首尾空白", () => {
    expect(sanitizeTonePhrases({ "character.stage.0": "  新芽初绽 \n" })).toEqual({
      "character.stage.0": "新芽初绽",
    });
  });

  it("带占位符的槽位，模型把 {rank} 写没了就整条不要", () => {
    expect(sanitizeTonePhrases({ "character.reward.levelUp": "晋阶！" })).toEqual({});
    expect(sanitizeTonePhrases({ "character.reward.levelUp": "晋阶 · {rank}" })).toEqual({
      "character.reward.levelUp": "晋阶 · {rank}",
    });
  });

  it("一条歪的不牵连其余的（部分可用就用部分）", () => {
    const out = sanitizeTonePhrases({
      "character.stage.0": "新芽初绽",
      "character.reward.levelUp": "晋阶！",
    });
    expect(out).toEqual({ "character.stage.0": "新芽初绽" });
  });
});

describe("makeToneT", () => {
  it("没语气包时原样返回传入的 t（不包一层）", () => {
    expect(makeToneT(fakeT, null, "zh")).toBe(fakeT);
    expect(makeToneT(fakeT, undefined, "zh")).toBe(fakeT);
    expect(makeToneT(fakeT, { lang: "zh" }, "zh")).toBe(fakeT);
  });

  it("语气包语言与当前语言不一致时不生效 —— 免得中文界面冒出英文腔", () => {
    const t = makeToneT(fakeT, pack({ "character.stage.0": "新芽初绽" }, "en"), "zh");
    expect(t).toBe(fakeT);
    expect(t("character.stage.0")).toBe("default:character.stage.0");
  });

  it("命中覆盖槽位用覆盖文案，未命中回退原 t", () => {
    const t = makeToneT(fakeT, pack({ "character.stage.0": "新芽初绽" }), "zh");
    expect(t("character.stage.0")).toBe("新芽初绽");
    expect(t("character.stage.1")).toBe("default:character.stage.1");
  });

  it("覆盖文案里的占位符照样插值", () => {
    const t = makeToneT(fakeT, pack({ "character.reward.levelUp": "晋阶 · {rank}" }), "zh");
    expect(t("character.reward.levelUp", { rank: "登峰造极" })).toBe("晋阶 · 登峰造极");
  });

  it("vars 里没给的占位符原样留着，不会被 undefined 顶掉", () => {
    const t = makeToneT(fakeT, pack({ "character.reward.levelUp": "晋阶 · {rank}" }), "zh");
    expect(t("character.reward.levelUp", { other: 1 })).toBe("晋阶 · {rank}");
    expect(t("character.reward.levelUp")).toBe("晋阶 · {rank}");
  });

  it("覆盖值不是字符串时（脏存档）回退原 t 而不是渲染出 [object Object]", () => {
    const t = makeToneT(fakeT, pack({ "character.stage.0": { a: 1 } }), "zh");
    expect(t("character.stage.0")).toBe("default:character.stage.0");
  });

  it("接上示例包：整条链路出的是冒险腔而非默认文案", () => {
    const t = makeToneT(fakeT, pack(SAMPLE_TONE_PACKS.zh), "zh");
    expect(t("character.momentum.hot")).toBe("势如破竹！");
    expect(t("character.reward.levelUp", { rank: "登峰造极" })).toBe("晋阶 · 登峰造极");
  });
});
