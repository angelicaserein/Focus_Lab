import { describe, it, expect } from "vitest";
import { isValidItemForm, itemToForm } from "@/pages/Reward/useCustomItemForm";

describe("isValidItemForm", () => {
  it("名称非空且花费为正 → 可提交", () => {
    expect(isValidItemForm({ name: "奶茶", price: "15" })).toBe(true);
  });

  it("名称全为空白 → 不可提交", () => {
    expect(isValidItemForm({ name: "   ", price: "15" })).toBe(false);
  });

  it("花费为 0 或负数 → 不可提交", () => {
    expect(isValidItemForm({ name: "x", price: "0" })).toBe(false);
    expect(isValidItemForm({ name: "x", price: "-5" })).toBe(false);
  });

  it("花费为空 / 非数字 → 不可提交", () => {
    expect(isValidItemForm({ name: "x", price: "" })).toBe(false);
    expect(isValidItemForm({ name: "x", price: "abc" })).toBe(false);
  });
});

describe("itemToForm", () => {
  it("价格转字符串、desc 兜底空串", () => {
    expect(itemToForm({ name: "奶茶", icon: "🧋", price: 15 })).toEqual({
      name: "奶茶",
      icon: "🧋",
      price: "15",
      desc: "",
    });
  });

  it("保留已有 desc", () => {
    expect(itemToForm({ name: "a", icon: "🎁", price: 5, desc: "犒劳" }).desc).toBe("犒劳");
  });
});
