import { describe, it, expect } from "vitest";
import {
  DEPRECATED_FEATURES,
  DEPRECATED_PATHS,
  DEPRECATED_ALL_KEYS,
  deprecatedKey,
  deprecatedParentOf,
  isDeprecatedPath,
} from "@/pages/Deprecated/deprecatedData";
import { FEATURE_KEYS } from "@/pages/FunctionTree/functionTreeData";
import { TRANSLATIONS } from "@/i18n/translations";

describe("废弃页面数据不变量", () => {
  it("DEPRECATED_PATHS = 所有条目的路径，且无重复", () => {
    expect(DEPRECATED_PATHS).toEqual(DEPRECATED_FEATURES.map(deprecatedKey));
    expect(new Set(DEPRECATED_PATHS).size).toBe(DEPRECATED_PATHS.length);
  });

  it("每条都带开关 key（路由或 前缀:名字）/ labelKey / icon，且文案中英齐全", () => {
    for (const f of DEPRECATED_FEATURES) {
      expect(deprecatedKey(f)).toMatch(/^(\/|[a-z]+:)/);
      expect(typeof f.icon).toBe("string");
      expect(TRANSLATIONS.zh[f.labelKey]).toBeTruthy();
      expect(TRANSLATIONS.en[f.labelKey]).toBeTruthy();
    }
  });

  it("只认名单里的路径（别的功能不该被误判成默认关闭）", () => {
    expect(isDeprecatedPath("/skilltree")).toBe(true);
    expect(isDeprecatedPath("/focus")).toBe(false);
    expect(isDeprecatedPath("/")).toBe(false);
  });

  it("情境功能整组在名单里：组是唯一的开关，三个子项跟着它走", () => {
    expect(DEPRECATED_PATHS).toContain(FEATURE_KEYS.SCENARIO_GROUP);
    for (const child of ["/scenario", "/scenario-stats", FEATURE_KEYS.SCENARIO_PICKER]) {
      expect(DEPRECATED_PATHS).not.toContain(child); // 子项不单独出现在页面上
      expect(DEPRECATED_ALL_KEYS).toContain(child);
      expect(isDeprecatedPath(child)).toBe(true);
      expect(deprecatedParentOf(child)).toBe(FEATURE_KEYS.SCENARIO_GROUP);
    }
    expect(deprecatedParentOf(FEATURE_KEYS.SCENARIO_GROUP)).toBe(null);
    expect(deprecatedParentOf("/skilltree")).toBe(null);
  });
});
