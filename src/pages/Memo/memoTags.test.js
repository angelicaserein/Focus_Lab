import { describe, it, expect } from "vitest";
import {
  normalizeTag,
  addTag,
  removeTag,
  collectTags,
  itemHasTag,
} from "@/pages/Memo/memoTags";

describe("normalizeTag", () => {
  it("去首尾空白并去掉前导 #", () => {
    expect(normalizeTag("  #工作 ")).toBe("工作");
  });

  it("压缩内部多余空白", () => {
    expect(normalizeTag("下 周   计划")).toBe("下 周 计划");
  });

  it("空串或非字符串返回空串", () => {
    expect(normalizeTag("   ")).toBe("");
    expect(normalizeTag(null)).toBe("");
    expect(normalizeTag(undefined)).toBe("");
  });
});

describe("addTag", () => {
  it("追加规范化后的标签", () => {
    expect(addTag(["工作"], " #生活")).toEqual(["工作", "生活"]);
  });

  it("大小写不敏感去重，重复时原样返回", () => {
    const tags = ["Work"];
    expect(addTag(tags, "work")).toBe(tags);
  });

  it("无效标签时原样返回", () => {
    const tags = ["工作"];
    expect(addTag(tags, "  ")).toBe(tags);
  });

  it("容忍 tags 非数组", () => {
    expect(addTag(undefined, "工作")).toEqual(["工作"]);
  });
});

describe("removeTag", () => {
  it("大小写不敏感移除", () => {
    expect(removeTag(["Work", "生活"], "work")).toEqual(["生活"]);
  });

  it("不存在时返回等价数组", () => {
    expect(removeTag(["工作"], "生活")).toEqual(["工作"]);
  });
});

describe("collectTags", () => {
  it("按频次降序、同频按名称升序汇总", () => {
    const items = [
      { tags: ["work", "b"] },
      { tags: ["work"] },
      { tags: ["a"] },
      { source: "focus" }, // 无 tags 字段
    ];
    expect(collectTags(items)).toEqual([
      { tag: "work", count: 2 },
      { tag: "a", count: 1 },
      { tag: "b", count: 1 },
    ]);
  });

  it("空输入返回空数组", () => {
    expect(collectTags([])).toEqual([]);
    expect(collectTags(undefined)).toEqual([]);
  });
});

describe("itemHasTag", () => {
  it("大小写不敏感命中", () => {
    expect(itemHasTag({ tags: ["Work"] }, "work")).toBe(true);
  });

  it("无 tags 字段返回 false", () => {
    expect(itemHasTag({ source: "focus" }, "工作")).toBe(false);
  });
});
