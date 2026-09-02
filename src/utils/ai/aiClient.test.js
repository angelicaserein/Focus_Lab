import { describe, it, expect } from "vitest";
import { extractJson } from "@/utils/ai/aiClient";

// extractJson 是四个 AI 模块（拆任务 / 反问 / 象限分配 / 情景推荐 / 推荐）共用的解析口，
// 之前没有直接测试。独立审查时发现的真 bug 见下面「尾随人话」一组。

describe("extractJson", () => {
  it("裸 JSON 与代码围栏都能取出", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson("```\n[1,2]\n```", "array")).toEqual([1, 2]);
  });

  it("非字符串 / 找不到括号 / 解析不了都返回 null", () => {
    expect(extractJson(null)).toBeNull();
    expect(extractJson(42)).toBeNull();
    expect(extractJson("没有任何 JSON")).toBeNull();
    expect(extractJson("[不是合法 JSON]", "array")).toBeNull();
  });

  it("取首个 JSON 值：前后的解释性文字被忽略", () => {
    expect(extractJson('这是结果：{"a":1} 就这些')).toEqual({ a: 1 });
    expect(extractJson('好的：[{"text":"买菜"}] 希望有帮助', "array")).toEqual([{ text: "买菜" }]);
  });

  // ── 独立审查发现的真 bug（2026-09-01，已修）────────────────────────────
  // 旧实现直接取「首个 open → 末个 close」。模型在 JSON 后面补的那句人话里
  // 只要出现一个 ] 或 }，切片就会多框进那段人话，JSON.parse 抛错后兜底成 null，
  // 于是一整批任务/问题静默变成空数组——用户看到的是「AI 什么都没拆出来」。
  // 原有的「容忍前后解释性文字」用例恰好用了不含括号的收尾文案，测不出这一条。
  it("收尾人话里带 ] 时，仍能取出前面的数组", () => {
    expect(extractJson('好的：[{"text":"买菜"}] 以上（见清单[1]）', "array"))
      .toEqual([{ text: "买菜" }]);
  });

  it("收尾人话里带 } 时，仍能取出前面的对象", () => {
    expect(extractJson('结果：{"a":1} 备注：占位符写作 {value}')).toEqual({ a: 1 });
  });

  it("JSON 内部的括号不受影响（字符串里的 ] 不会被当成收尾）", () => {
    expect(extractJson('[{"text":"读《方案[v2]》"}] 完成了]', "array"))
      .toEqual([{ text: "读《方案[v2]》" }]);
  });

  it("退不出合法 JSON 时仍返回 null，不会硬凑一个残缺值", () => {
    expect(extractJson("[abc] def]", "array")).toBeNull();
  });
});
