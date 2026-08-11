import { describe, it, expect } from "vitest";
import {
  DEPRECATED_FEATURES,
  DEPRECATED_PATHS,
  isDeprecatedPath,
} from "@/pages/Deprecated/deprecatedData";
import { TRANSLATIONS } from "@/i18n/translations";

describe("废弃页面数据不变量", () => {
  it("DEPRECATED_PATHS = 所有条目的路径，且无重复", () => {
    expect(DEPRECATED_PATHS).toEqual(DEPRECATED_FEATURES.map((f) => f.path));
    expect(new Set(DEPRECATED_PATHS).size).toBe(DEPRECATED_PATHS.length);
  });

  it("每条都带 path / labelKey / icon，且文案中英齐全", () => {
    for (const f of DEPRECATED_FEATURES) {
      expect(f.path).toMatch(/^\//);
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
});
