import { describe, it, expect } from "vitest";
import { getItemState } from "@/pages/Reward/rewardUtils";

// 构造奖励上下文的最小实现
const reward = (coins, owned = [], counts = {}) => ({
  coins,
  isOwned: (id) => owned.includes(id),
  getRedeemCount: (id) => counts[id] ?? 0,
});

describe("getItemState", () => {
  it("unlock 已拥有：owned=true 且按钮禁用", () => {
    const item = { id: "theme-pink", type: "unlock", price: 30 };
    expect(getItemState(item, reward(100, ["theme-pink"]))).toEqual({
      owned: true,
      count: 0,
      affordable: true,
      disabled: true,
    });
  });

  it("unlock 未拥有且买得起：可购买", () => {
    const item = { id: "theme-pink", type: "unlock", price: 30 };
    expect(getItemState(item, reward(30))).toEqual({
      owned: false,
      count: 0,
      affordable: true,
      disabled: false,
    });
  });

  it("金币不足：affordable=false 且禁用", () => {
    const item = { id: "x", type: "consumable", price: 50 };
    expect(getItemState(item, reward(10))).toMatchObject({
      affordable: false,
      disabled: true,
    });
  });

  it("consumable 反映已兑换次数，且可重复兑换", () => {
    const item = { id: "milk-tea", type: "consumable", price: 15 };
    expect(getItemState(item, reward(100, [], { "milk-tea": 3 }))).toEqual({
      owned: false,
      count: 3,
      affordable: true,
      disabled: false,
    });
  });

  it("coins 恰好等于 price 视为买得起", () => {
    const item = { id: "x", type: "consumable", price: 20 };
    expect(getItemState(item, reward(20)).affordable).toBe(true);
  });
});
