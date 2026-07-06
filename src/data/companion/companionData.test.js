import { describe, it, expect } from "vitest";
import {
  WISH_POOL,
  ALL_MET_REFUND,
  drawWish,
  itemById,
  lookForOutfit,
  DEFAULT_LOOK,
  companionLine,
} from "./companionData";

describe("drawWish（无损祈愿）", () => {
  it("空收集时抽到的一定是池中真实存在的物品", () => {
    const draw = drawWish([]);
    expect(draw.itemId).toBeTruthy();
    expect(itemById(draw.itemId)).toBeDefined();
  });

  it("永远抽到「还没遇见」的物品——不会抽到已拥有的（无重复挫败）", () => {
    const owned = WISH_POOL.slice(0, WISH_POOL.length - 1).map((it) => it.id);
    const lastId = WISH_POOL[WISH_POOL.length - 1].id;
    // 只剩最后一件没遇见，任意 rng 都应抽到它
    for (const r of [0, 0.5, 0.999]) {
      expect(drawWish(owned, () => r)).toEqual({ itemId: lastId });
    }
  });

  it("全部遇见后返星尘、永不空军", () => {
    const allIds = WISH_POOL.map((it) => it.id);
    expect(drawWish(allIds)).toEqual({ stardust: ALL_MET_REFUND });
  });

  it("多次抽取直到抽空，恰好覆盖整池且无重复", () => {
    const collected = [];
    let rng = 0;
    // 用递增 rng 遍历权重区间，凑齐所有物品
    for (let i = 0; i < WISH_POOL.length; i++) {
      const draw = drawWish(collected, () => (rng % 100) / 100);
      rng += 17;
      if (draw.itemId) collected.push(draw.itemId);
    }
    // 再抽应返星尘
    const after = drawWish(collected);
    expect(after).toEqual({ stardust: ALL_MET_REFUND });
    expect(new Set(collected).size).toBe(collected.length); // 无重复
  });
});

describe("lookForOutfit / companionLine", () => {
  it("未知或未佩戴 outfit 回退默认暖金", () => {
    expect(lookForOutfit(null)).toEqual(DEFAULT_LOOK);
    expect(lookForOutfit("nope")).toEqual(DEFAULT_LOOK);
  });

  it("companionLine 用注入的 rng 取到对应心情的某条台词 key", () => {
    const t = (k) => k;
    expect(companionLine(t, "cheer", () => 0)).toBe("companion.line.cheer.0");
    expect(companionLine(t, "bogus", () => 0)).toBe("companion.line.idle.0"); // 非法心情回退 idle
  });
});
