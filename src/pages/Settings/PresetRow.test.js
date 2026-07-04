import { describe, it, expect } from "vitest";
import { clampPreset } from "@/pages/Settings/PresetRow";

describe("clampPreset", () => {
  it("正常范围内原样返回", () => {
    expect(clampPreset("25")).toBe(25);
  });

  it("低于下限夹到 1", () => {
    expect(clampPreset("0")).toBe(1);
    expect(clampPreset("-10")).toBe(1);
  });

  it("高于上限夹到 180", () => {
    expect(clampPreset("999")).toBe(180);
  });

  it("非数字返回 null（保持当前值）", () => {
    expect(clampPreset("")).toBeNull();
    expect(clampPreset("abc")).toBeNull();
  });

  it("小数按 parseInt 截断", () => {
    expect(clampPreset("30.9")).toBe(30);
  });
});
