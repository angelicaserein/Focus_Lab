// 人生 RPG 的角色数值层 —— 把已有的专注记录 / 场景 / 金币推导成
// 「等级 · 经验 · 连续天数 · 技能线」。纯数据、与 React 无关，便于复用与单测。
//
// 设计原则：不新增任何持久化字段，全部从 focusRecords + scenarios + coins 推导，
// 这样即便未来清空/迁移数据，角色面板也始终与真实专注时长一致。
/** @import { FocusRecord, Scenario } from '@/types' */

import { totalFocusSecs, sessionKey } from "@/utils/records/focusRecords";

// 经验值即累计专注秒数。等级曲线用二次方：达到 L 级需累计 XP_BASE * L² 秒，
// 越往后每级间隔越大（1→2 级要 5 分钟，9→10 级要 ~16 分钟增量），
// 契合「前期正反馈密、后期有追求」的 ADHD 友好节奏。
export const XP_BASE = 300; // 1 级门槛 = 5 分钟专注

// 由累计经验推导等级与当前级内进度。
// 返回 progress ∈ [0,1] 供进度条直接使用。
export function levelFromXp(xp) {
  const safe = Math.max(0, Math.floor(xp || 0));
  const level = Math.floor(Math.sqrt(safe / XP_BASE));
  const curBase = XP_BASE * level * level;
  const nextBase = XP_BASE * (level + 1) * (level + 1);
  const xpIntoLevel = safe - curBase;
  const xpForNextLevel = nextBase - curBase;
  return {
    level,
    xp: safe,
    xpIntoLevel,
    xpForNextLevel,
    xpToNext: xpForNextLevel - xpIntoLevel,
    progress: xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 0,
  };
}

// 等级称号（职业线）。取 level >= min 的最后一档。
export const RANK_TITLES = [
  { min: 0, zh: "见习者", en: "Novice", icon: "🌱" },
  { min: 3, zh: "学徒", en: "Apprentice", icon: "📗" },
  { min: 6, zh: "冒险者", en: "Adventurer", icon: "🗡️" },
  { min: 10, zh: "老手", en: "Veteran", icon: "🛡️" },
  { min: 15, zh: "大师", en: "Master", icon: "⚔️" },
  { min: 22, zh: "宗师", en: "Grandmaster", icon: "👑" },
  { min: 30, zh: "传奇", en: "Legend", icon: "🔥" },
];

export function rankForLevel(level) {
  let rank = RANK_TITLES[0];
  for (const r of RANK_TITLES) {
    if (level >= r.min) rank = r;
  }
  return rank;
}

// 技能图标池：为每个场景确定性地分配一个图标（按 id 哈希取模，稳定不跳动）。
const SKILL_ICONS = ["🧠", "💪", "⚡", "🎨", "📚", "🔬", "🎯", "🧩", "🎵", "🌿"];

function iconForId(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SKILL_ICONS[h % SKILL_ICONS.length];
}

// 一天的本地零点毫秒（用于连续天数判定，避免时区/时刻误差）。
function dayStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 86400000;

// 连续专注天数（streak）：从今天往前数连续有记录的自然日。
// 今天还没专注但昨天有，则从昨天起算（当天尚未中断，不清零）。
/** @param {FocusRecord[]} records */
export function computeStreak(records, now = Date.now()) {
  if (!records || records.length === 0) return 0;
  const days = new Set(records.map((r) => dayStart(r.startedAt)));
  let cursor = dayStart(now);
  if (!days.has(cursor)) {
    cursor -= DAY_MS;
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

// 把每个场景变成一条「技能线」：等级由该场景下的专注墙钟时长推导。
// 未归类的专注单独汇成一条「自由探索」。按经验从高到低排序。
/** @param {FocusRecord[]} records @param {Scenario[]} scenarios */
export function computeSkills(records, scenarios = []) {
  const skills = scenarios.map((s) => {
    const secs = totalFocusSecs(records.filter((r) => r.scenarioId === s.id));
    return { id: s.id, title: s.title, icon: iconForId(s.id), ...levelFromXp(secs) };
  });

  const looseSecs = totalFocusSecs(records.filter((r) => !r.scenarioId));
  if (looseSecs > 0) {
    skills.push({
      id: "__unclassified__",
      title: null, // UI 侧用 i18n 文案渲染
      icon: "✨",
      unclassified: true,
      ...levelFromXp(looseSecs),
    });
  }

  return skills.sort((a, b) => b.xp - a.xp);
}

// 聚合出完整角色卡：主等级 + 称号 + 金币 + 连续天数 + 会话数 + 技能线。
// 组件侧只需一次 useMemo 调用本函数。
/** @param {{ records?: FocusRecord[], scenarios?: Scenario[], coins?: number }} input */
export function computeCharacter({ records = [], scenarios = [], coins = 0 } = {}, now = Date.now()) {
  const xp = totalFocusSecs(records);
  const core = levelFromXp(xp);
  return {
    ...core,
    rank: rankForLevel(core.level),
    coins,
    streak: computeStreak(records, now),
    sessionCount: new Set(records.map((r) => sessionKey(r))).size,
    skills: computeSkills(records, scenarios),
  };
}
