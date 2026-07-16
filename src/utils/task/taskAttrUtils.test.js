import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatDate, formatMins, isDuePast, buildSortWeightMap } from "@/utils/task/taskAttrUtils";

describe("formatDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 14, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("空值返回空串", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(null)).toBe("");
  });

  it("今年的日期省略年份", () => {
    expect(formatDate("2026-06-20")).toBe("06/20");
  });

  it("非今年的日期带上年份", () => {
    expect(formatDate("2025-06-20")).toBe("2025/06/20");
    expect(formatDate("2027-01-03")).toBe("2027/01/03");
  });
});

describe("formatMins", () => {
  it("0 / 空值返回空串", () => {
    expect(formatMins(0)).toBe("");
    expect(formatMins(undefined)).toBe("");
  });

  it("不足 1 小时只显示分", () => {
    expect(formatMins(45)).toBe("45分");
  });

  it("整小时省略分", () => {
    expect(formatMins(120)).toBe("2h");
  });

  it("有余分时显示时分", () => {
    expect(formatMins(90)).toBe("1h30m");
  });
});

describe("isDuePast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 14, 14, 30, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("空值不算过期", () => {
    expect(isDuePast("")).toBe(false);
    expect(isDuePast(null)).toBe(false);
  });

  it("今天不算过期（哪怕已过大半天）", () => {
    expect(isDuePast("2026-06-14")).toBe(false);
  });

  it("昨天及更早算过期", () => {
    expect(isDuePast("2026-06-13")).toBe(true);
    expect(isDuePast("2025-12-31")).toBe(true);
  });

  it("未来不算过期", () => {
    expect(isDuePast("2026-06-15")).toBe(false);
  });
});

describe("buildSortWeightMap", () => {
  it("无属性定义 / 无 options 时返回空 map", () => {
    expect(buildSortWeightMap(null)).toEqual({});
    expect(buildSortWeightMap({})).toEqual({});
    expect(buildSortWeightMap({ options: null })).toEqual({});
  });

  it("按 optionId → sortWeight 建映射", () => {
    const def = { options: [{ id: "high", sortWeight: 3 }, { id: "low", sortWeight: 1 }] };
    expect(buildSortWeightMap(def)).toEqual({ high: 3, low: 1 });
  });

  it("缺 sortWeight 的选项默认权重 0", () => {
    expect(buildSortWeightMap({ options: [{ id: "none" }] })).toEqual({ none: 0 });
  });

  it("权重为 0 被保留，不被当成缺省丢掉", () => {
    expect(buildSortWeightMap({ options: [{ id: "zero", sortWeight: 0 }] })).toEqual({ zero: 0 });
  });

  it("空 options 返回空 map", () => {
    expect(buildSortWeightMap({ options: [] })).toEqual({});
  });
});
