// 技能树两种形态共用的数据层。纯数据、与 React 无关，便于复用与单测。
//
// 说明：这里有两套完全不同的「技能」概念，别混淆——
//  1) 成长星图（constellation）：不新增任何存储，直接把 useCharacter 推导出的
//     5 大人生属性 + 场景技能线摆成星图，只是换一种空间化的呈现。
//  2) 可解锁技能树（unlock）：经典 RPG 的点技能点。它需要「你点了哪些节点」这份
//     新的持久化状态（存 localStorage），并带有前置依赖 / 门禁——这是刻意的游戏化
//     试验分支，与角色卡「全部从行为推导、无门禁」的原则不同，仅用于并排比较取舍。

// ── 可解锁技能树：天赋点经济 ──────────────────────────────
// 起手赠送几点，保证新用户也能点开第一层、直观看到解锁效果（试验原型）。
export const BASE_TALENT_POINTS = 3;

// 三条分支，每条一个 4 节点的小菱形：root → (left, right) → capstone(需前两者)。
// gx/gy 是布局网格坐标（gx 0..12 横向、gy 纵向 tier），组件按固定单位换算成像素。
export const SKILL_BRANCHES = [
  { id: "focus", icon: "🎯", color: "#6ea8fe" },
  { id: "execution", icon: "⚡", color: "#f59e0b" },
  { id: "exploration", icon: "🧭", color: "#34d399" },
];

export const SKILL_NODES = [
  // 专注之道
  { id: "foc_root", branch: "focus", icon: "🎯", cost: 1, prereq: [], gx: 2, gy: 0 },
  { id: "foc_l", branch: "focus", icon: "🧘", cost: 1, prereq: ["foc_root"], gx: 1, gy: 1 },
  { id: "foc_r", branch: "focus", icon: "🌊", cost: 2, prereq: ["foc_root"], gx: 3, gy: 1 },
  { id: "foc_cap", branch: "focus", icon: "🌀", cost: 3, prereq: ["foc_l", "foc_r"], gx: 2, gy: 2 },
  // 执行之力
  { id: "exe_root", branch: "execution", icon: "🚀", cost: 1, prereq: [], gx: 6, gy: 0 },
  { id: "exe_l", branch: "execution", icon: "📋", cost: 1, prereq: ["exe_root"], gx: 5, gy: 1 },
  { id: "exe_r", branch: "execution", icon: "🔥", cost: 2, prereq: ["exe_root"], gx: 7, gy: 1 },
  { id: "exe_cap", branch: "execution", icon: "🏁", cost: 3, prereq: ["exe_l", "exe_r"], gx: 6, gy: 2 },
  // 探索之心
  { id: "exp_root", branch: "exploration", icon: "🧭", cost: 1, prereq: [], gx: 10, gy: 0 },
  { id: "exp_l", branch: "exploration", icon: "📚", cost: 1, prereq: ["exp_root"], gx: 9, gy: 1 },
  { id: "exp_r", branch: "exploration", icon: "🔗", cost: 2, prereq: ["exp_root"], gx: 11, gy: 1 },
  { id: "exp_cap", branch: "exploration", icon: "🦉", cost: 3, prereq: ["exp_l", "exp_r"], gx: 10, gy: 2 },
];

const NODE_BY_ID = Object.fromEntries(SKILL_NODES.map((n) => [n.id, n]));
const BRANCH_BY_ID = Object.fromEntries(SKILL_BRANCHES.map((b) => [b.id, b]));

export function nodeById(id) {
  return NODE_BY_ID[id];
}
export function branchColor(branchId) {
  return BRANCH_BY_ID[branchId]?.color ?? "#888";
}

// 已赚得的天赋点：起手赠点 + 主等级 + 各人生属性等级之和。
// 全部由真实行为推导（属性/等级来自 useCharacter），只有「花在哪」是新存的状态。
export function earnedTalentPoints(char) {
  const attrLevels = (char?.attributes ?? []).reduce((s, a) => s + (a.level || 0), 0);
  return BASE_TALENT_POINTS + (char?.level || 0) + attrLevels;
}

// 已花费 = 所有已解锁节点的 cost 之和。
export function spentTalentPoints(unlockedIds) {
  return (unlockedIds || []).reduce((s, id) => s + (NODE_BY_ID[id]?.cost || 0), 0);
}

// 某节点前置是否全部满足。
export function prereqMet(node, unlockedSet) {
  return node.prereq.every((p) => unlockedSet.has(p));
}

// 计算每个节点在当前状态下的可交互态，供组件直接渲染。
//   status: "unlocked" | "available"（可点） | "locked"（前置未满足） | "poor"（前置满足但点数不够）
export function computeNodeStates(unlockedIds, available) {
  const unlockedSet = new Set(unlockedIds || []);
  return SKILL_NODES.map((node) => {
    let status;
    if (unlockedSet.has(node.id)) status = "unlocked";
    else if (!prereqMet(node, unlockedSet)) status = "locked";
    else if (node.cost > available) status = "poor";
    else status = "available";
    return { ...node, status };
  });
}
