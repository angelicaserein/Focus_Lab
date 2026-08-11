import { describe, it, expect } from "vitest";
import {
  clearDebugFill,
  mergeDebugFills,
  normalizeDebugFills,
  setDebugFill,
} from "@/pages/Flasks/flaskDebug";

describe("normalizeDebugFills", () => {
  it("空 / 坏存档一律当没设过", () => {
    expect(normalizeDebugFills(null)).toEqual({});
    expect(normalizeDebugFills("oops")).toEqual({});
    expect(normalizeDebugFills([1, 2])).toEqual({});
  });

  it("丢弃非数、负数与空 id，秒数取整", () => {
    expect(normalizeDebugFills({ a: "x", b: -1, "": 10, c: 60.6 })).toEqual({ c: 61 });
  });
});

describe("setDebugFill / clearDebugFill", () => {
  it("设值不改入参，负数按 0 处理", () => {
    const before = { a: 60 };
    expect(setDebugFill(before, "b", -5)).toEqual({ a: 60, b: 0 });
    expect(before).toEqual({ a: 60 });
  });

  it("撤掉覆盖后这只瓶子回到现算水位", () => {
    expect(clearDebugFill({ a: 60, b: 120 }, "a")).toEqual({ b: 120 });
  });
});

describe("mergeDebugFills", () => {
  it("有覆盖的以覆盖为准，没覆盖的用现算值", () => {
    expect(mergeDebugFills({ a: 900, b: 60 }, { a: 3600 })).toEqual({ a: 3600, b: 60 });
  });

  it("覆盖表可以给现算里还没出现过的瓶子设水位", () => {
    expect(mergeDebugFills({}, { a: 3600 })).toEqual({ a: 3600 });
  });
});
