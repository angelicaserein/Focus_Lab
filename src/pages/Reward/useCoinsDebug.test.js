import { describe, it, expect } from "vitest";
import { normalizeCoins } from "@/pages/Reward/useCoinsDebug";

describe("normalizeCoins", () => {
  it("小数向下取整", () => {
    expect(normalizeCoins("3.7")).toBe(3);
  });

  it("负数归零", () => {
    expect(normalizeCoins("-5")).toBe(0);
  });

  it("空 / 非法输入归零", () => {
    expect(normalizeCoins("")).toBe(0);
    expect(normalizeCoins("abc")).toBe(0);
  });

  it("整数原样返回", () => {
    expect(normalizeCoins("42")).toBe(42);
  });
});
