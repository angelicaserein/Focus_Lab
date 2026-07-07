import { describe, it, expect } from "vitest";
import {
  BASE_TALENT_POINTS,
  nodeById,
  earnedTalentPoints,
  spentTalentPoints,
  prereqMet,
  computeNodeStates,
} from "@/pages/SkillTree/skillTreeData";

describe("earnedTalentPoints", () => {
  it("= 起手赠点 + 主等级 + 各属性等级之和", () => {
    const char = { level: 2, attributes: [{ level: 1 }, { level: 0 }, { level: 3 }] };
    expect(earnedTalentPoints(char)).toBe(BASE_TALENT_POINTS + 2 + 4);
  });

  it("空/缺字段安全：只发起手赠点", () => {
    expect(earnedTalentPoints({})).toBe(BASE_TALENT_POINTS);
    expect(earnedTalentPoints(undefined)).toBe(BASE_TALENT_POINTS);
  });
});

describe("spentTalentPoints", () => {
  it("= 已解锁节点 cost 之和，未知 id 忽略", () => {
    // foc_root=1, foc_r=2
    expect(spentTalentPoints(["foc_root", "foc_r"])).toBe(3);
    expect(spentTalentPoints(["foc_root", "does_not_exist"])).toBe(1);
    expect(spentTalentPoints([])).toBe(0);
  });
});

describe("prereqMet", () => {
  it("capstone 需前两者都解锁", () => {
    const cap = nodeById("foc_cap"); // prereq [foc_l, foc_r]
    expect(prereqMet(cap, new Set(["foc_l"]))).toBe(false);
    expect(prereqMet(cap, new Set(["foc_l", "foc_r"]))).toBe(true);
  });

  it("root 无前置，恒满足", () => {
    expect(prereqMet(nodeById("foc_root"), new Set())).toBe(true);
  });
});

describe("computeNodeStates", () => {
  const stateOf = (states, id) => states.find((n) => n.id === id).status;

  it("点数充足、无解锁：root 可解锁，其子节点前置未满足→locked", () => {
    const s = computeNodeStates([], 99);
    expect(stateOf(s, "foc_root")).toBe("available");
    expect(stateOf(s, "foc_l")).toBe("locked");
    expect(stateOf(s, "foc_cap")).toBe("locked");
  });

  it("点数为 0：前置满足但买不起 → poor", () => {
    const s = computeNodeStates([], 0);
    expect(stateOf(s, "foc_root")).toBe("poor");
  });

  it("解锁 root 后，两个子节点变可解锁，capstone 仍缺前置", () => {
    const s = computeNodeStates(["foc_root"], 99);
    expect(stateOf(s, "foc_root")).toBe("unlocked");
    expect(stateOf(s, "foc_l")).toBe("available");
    expect(stateOf(s, "foc_r")).toBe("available");
    expect(stateOf(s, "foc_cap")).toBe("locked");
  });

  it("前置齐全后 capstone 视点数在 available / poor 间切换", () => {
    const unlocked = ["foc_root", "foc_l", "foc_r"];
    expect(stateOf(computeNodeStates(unlocked, 3), "foc_cap")).toBe("available"); // cost 3
    expect(stateOf(computeNodeStates(unlocked, 2), "foc_cap")).toBe("poor");
  });
});
