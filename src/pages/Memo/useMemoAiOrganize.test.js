import { describe, it, expect } from "vitest";
import { collectSelectedText } from "@/pages/Memo/useMemoAiOrganize";

const timeline = [
  { id: "a", text: "买菜" },
  { id: "b", text: "写报告" },
  { id: "c", text: "打电话" },
];

describe("collectSelectedText", () => {
  it("只收集被勾选的条目，按换行拼接", () => {
    expect(collectSelectedText(timeline, new Set(["a", "c"]))).toBe("买菜\n打电话");
  });

  it("未勾选任何条目返回空串", () => {
    expect(collectSelectedText(timeline, new Set())).toBe("");
  });

  it("始终按 timeline 顺序拼接（与勾选先后无关）", () => {
    expect(collectSelectedText(timeline, new Set(["c", "a", "b"]))).toBe(
      "买菜\n写报告\n打电话",
    );
  });
});
