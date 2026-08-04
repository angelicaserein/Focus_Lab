import { describe, it, expect } from "vitest";
import {
  CORE_PATHS,
  FUNCTION_BRANCHES,
  TOGGLEABLE_PATHS,
  isCorePath,
} from "@/pages/FunctionTree/functionTreeData";

describe("功能树数据不变量", () => {
  it("TOGGLEABLE_PATHS = 所有分支叶子路径的扁平合集，且无重复", () => {
    const flat = FUNCTION_BRANCHES.flatMap((b) => b.features.map((f) => f.path));
    expect(TOGGLEABLE_PATHS).toEqual(flat);
    expect(new Set(TOGGLEABLE_PATHS).size).toBe(TOGGLEABLE_PATHS.length);
  });

  it("核心功能不出现在任何分支里（避免出现无法关闭却又列出的开关）", () => {
    for (const core of CORE_PATHS) {
      expect(TOGGLEABLE_PATHS).not.toContain(core);
    }
  });

  it("功能树页自身、主页、设置都是核心，永不可关", () => {
    expect(isCorePath("/functiontree")).toBe(true);
    expect(isCorePath("/")).toBe(true);
    expect(isCorePath("/settings")).toBe(true);
    expect(isCorePath("/focus")).toBe(false);
  });

  it("除了核心兜底三页，其余每个页面都可开关", () => {
    // 教程不是兜底页，应当可关
    expect(isCorePath("/tutorial")).toBe(false);
    expect(TOGGLEABLE_PATHS).toContain("/tutorial");
  });

  it("每个叶子都带 path / labelKey / icon", () => {
    for (const b of FUNCTION_BRANCHES) {
      for (const f of b.features) {
        expect(f.path).toMatch(/^\//);
        expect(f.labelKey).toMatch(/^nav\./);
        expect(typeof f.icon).toBe("string");
      }
    }
  });
});
