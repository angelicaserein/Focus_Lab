import { describe, it, expect } from "vitest";
import {
  CORE_PATHS,
  FEATURE_KEYS,
  FUNCTION_BRANCHES,
  TOGGLEABLE_PATHS,
  featureKey,
  isCorePath,
  parentKeyOf,
} from "@/pages/FunctionTree/functionTreeData";
import { DEPRECATED_ALL_KEYS } from "@/pages/Deprecated/deprecatedData";

describe("功能树数据不变量", () => {
  it("TOGGLEABLE_PATHS = 所有节点 key 的扁平合集（含组自身与组内子项），且无重复", () => {
    const flat = FUNCTION_BRANCHES.flatMap((b) =>
      b.features.flatMap((f) => [featureKey(f), ...(f.children ?? []).map(featureKey)]),
    );
    expect(TOGGLEABLE_PATHS).toEqual(flat);
    expect(new Set(TOGGLEABLE_PATHS).size).toBe(TOGGLEABLE_PATHS.length);
  });

  it("核心功能不出现在任何分支里（避免出现无法关闭却又列出的开关）", () => {
    for (const core of CORE_PATHS) {
      expect(TOGGLEABLE_PATHS).not.toContain(core);
    }
  });

  it("两个开关页自身、主页、设置都是核心，永不可关", () => {
    expect(isCorePath("/functiontree")).toBe(true);
    expect(isCorePath("/deprecated")).toBe(true);
    expect(isCorePath("/")).toBe(true);
    expect(isCorePath("/settings")).toBe(true);
    expect(isCorePath("/focus")).toBe(false);
  });

  it("除了核心兜底页，其余每个页面都可开关", () => {
    // 专注不是兜底页，应当可关
    expect(isCorePath("/focus")).toBe(false);
    expect(TOGGLEABLE_PATHS).toContain("/focus");
  });

  it("废弃页面的旧功能已从功能树移走，不在两处重复出现", () => {
    for (const path of DEPRECATED_ALL_KEYS) {
      expect(TOGGLEABLE_PATHS).not.toContain(path);
      expect(isCorePath(path)).toBe(false);
    }
  });

  it("每个节点都带开关 key（路由或 前缀:名字）、labelKey、icon", () => {
    const walk = (f) => {
      // 页面用路由当 key，非页面功能件用 "前缀:名字"，两者不会撞车
      expect(featureKey(f)).toMatch(/^(\/|[a-z]+:)/);
      expect(typeof f.labelKey).toBe("string");
      expect(f.labelKey.length).toBeGreaterThan(0);
      expect(typeof f.icon).toBe("string");
      for (const c of f.children ?? []) walk(c);
    };
    for (const b of FUNCTION_BRANCHES) for (const f of b.features) walk(f);
  });

  it("组只嵌一层：子节点自己不再带 children", () => {
    for (const b of FUNCTION_BRANCHES) {
      for (const f of b.features) {
        for (const c of f.children ?? []) expect(c.children).toBeUndefined();
      }
    }
  });

  it("parentKeyOf：树里现在没有组，叶子一律无父", () => {
    expect(parentKeyOf("/focus")).toBe(null);
    // 情境整组已搬去废弃页面，它的父子关系归 deprecatedParentOf 管
    expect(parentKeyOf(FEATURE_KEYS.SCENARIO_PICKER)).toBe(null);
  });

});
