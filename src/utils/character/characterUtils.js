// 人生 RPG 的角色数值层 —— 把已有的专注记录 / 任务 / 场景 / 金币推导成
// 「等级 · 经验 · 连续天数 · 技能线 · 人生属性 · 成就」。
// 纯数据、与 React 无关，便于复用与单测。
//
// 设计原则：不新增任何持久化字段，全部从现有数据推导，
// 这样即便未来清空/迁移数据，角色面板也始终与真实行为一致。
/** @import { FocusRecord, Scenario, Todo } from '@/types' */

import { totalFocusSecs, sessionKey } from "@/utils/records/focusRecords";

// 经验值基线：等级曲线用二次方，达到 L 级需累计 XP_BASE * L² 点经验。
// 越往后每级间隔越大，契合「前期正反馈密、后期有追求」的 ADHD 友好节奏。
export const XP_BASE = 300; // 1 级门槛 = 5 分钟专注（或等价经验）

// 「专注秒数」之外的其他行为换算成经验的单价（单位：经验点）。
// 用「≈ 多少秒专注」来标定，方便和主经验条同尺度理解。
export const XP_PER_TASK = 60; // 完成 1 个任务 ≈ 1 分钟专注
export const XP_PER_FOCUS_DAY = 120; // 每有 1 个专注日 ≈ 2 分钟（奖励天天来）
export const XP_PER_CLEAN_SESSION = 60; // 1 次零分心专注 ≈ 1 分钟

// 由累计经验推导等级与当前级内进度。progress ∈ [0,1] 供进度条直接使用。
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

// 一天的本地零点毫秒（用于连续天数 / 专注日判定，避免时区/时刻误差）。
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

// 会话级聚合：把记录按 sessionId 归并，取墙钟时长（max）与分心数（max，
// 因为分心数在结算时会复制到同会话每条记录上，取 max 避免叠加）。
/** @param {FocusRecord[]} records */
function aggregateSessions(records) {
  const map = new Map();
  for (const r of records) {
    const k = sessionKey(r);
    const cur = map.get(k) ?? { secs: 0, distractions: 0 };
    cur.secs = Math.max(cur.secs, r.durationSecs);
    cur.distractions = Math.max(cur.distractions, r.distractionCount ?? 0);
    map.set(k, cur);
  }
  return [...map.values()];
}

// 从原始数据算出一组「行为指标」，供经验拆解 / 属性 / 成就三处共用。
/** @param {{ records: FocusRecord[], todos: Todo[] }} input */
export function computeMetrics({ records = [], todos = [] } = {}) {
  const sessions = aggregateSessions(records);
  const cleanSessions = sessions.filter((s) => s.distractions === 0);

  return {
    totalSecs: totalFocusSecs(records),
    sessionCount: sessions.length,
    longestSecs: records.reduce((m, r) => Math.max(m, r.durationSecs), 0),
    focusDays: new Set(records.map((r) => dayStart(r.startedAt))).size,
    cleanSessionCount: cleanSessions.length,
    cleanSessionSecs: cleanSessions.reduce((sum, s) => sum + s.secs, 0),
    completedTasks: todos.filter((t) => t.completed).length,
    distinctScenarios: new Set(records.filter((r) => r.scenarioId).map((r) => r.scenarioId)).size,
    distinctTasks: new Set(records.map((r) => r.taskId)).size,
  };
}

// 主经验的来源拆解：专注秒数为主，另计完成任务 / 专注天数 / 零分心三项加成。
// 返回 { total, sources[] }，total 即主等级所用的总经验。
export function computeXpBreakdown(metrics) {
  const sources = [
    { key: "focus", icon: "⏱️", xp: metrics.totalSecs },
    { key: "tasks", icon: "✅", xp: metrics.completedTasks * XP_PER_TASK },
    { key: "days", icon: "📅", xp: metrics.focusDays * XP_PER_FOCUS_DAY },
    { key: "clean", icon: "🧘", xp: metrics.cleanSessionCount * XP_PER_CLEAN_SESSION },
  ];
  const total = sources.reduce((sum, s) => sum + s.xp, 0);
  return { total, sources };
}

// 固定人生属性：不依赖用户自建场景，直接把行为信号映射到 5 个维度。
// 每个维度用同一条等级曲线，metricKind 告诉 UI 如何格式化底部的「原始数值」。
export function computeAttributes(metrics) {
  const defs = [
    { id: "intellect", icon: "🧠", points: metrics.totalSecs, metricValue: metrics.totalSecs, metricKind: "time" },
    { id: "grit", icon: "💪", points: metrics.focusDays * XP_BASE, metricValue: metrics.focusDays, metricKind: "days" },
    { id: "focus", icon: "🎯", points: metrics.cleanSessionSecs, metricValue: metrics.cleanSessionCount, metricKind: "sessions" },
    { id: "execution", icon: "⚡", points: metrics.completedTasks * XP_BASE, metricValue: metrics.completedTasks, metricKind: "count" },
    { id: "exploration", icon: "🗺️", points: metrics.distinctScenarios * XP_BASE + metrics.distinctTasks * 60, metricValue: metrics.distinctTasks, metricKind: "count" },
  ];
  return defs.map((d) => ({ ...d, ...levelFromXp(d.points) }));
}

// 成就定义：test(ctx) 判定是否解锁；progress(ctx) 可选，给未解锁项一个进度条。
// ctx = { metrics, level, coins, streak }。
export const ACHIEVEMENTS = [
  { id: "firstFocus", icon: "🎬", test: (c) => c.metrics.sessionCount >= 1 },
  { id: "hourClub", icon: "⌛", test: (c) => c.metrics.totalSecs >= 3600,
    progress: (c) => ({ cur: c.metrics.totalSecs, target: 3600 }) },
  { id: "marathon", icon: "🏃", test: (c) => c.metrics.longestSecs >= 3600,
    progress: (c) => ({ cur: c.metrics.longestSecs, target: 3600 }) },
  { id: "weekStreak", icon: "🔥", test: (c) => c.streak >= 7,
    progress: (c) => ({ cur: c.streak, target: 7 }) },
  { id: "zen", icon: "🧘", test: (c) => c.metrics.cleanSessionCount >= 5,
    progress: (c) => ({ cur: c.metrics.cleanSessionCount, target: 5 }) },
  { id: "explorer", icon: "🗺️", test: (c) => c.metrics.distinctScenarios >= 3,
    progress: (c) => ({ cur: c.metrics.distinctScenarios, target: 3 }) },
  { id: "finisher", icon: "☑️", test: (c) => c.metrics.completedTasks >= 20,
    progress: (c) => ({ cur: c.metrics.completedTasks, target: 20 }) },
  { id: "wealthy", icon: "💰", test: (c) => c.coins >= 1000,
    progress: (c) => ({ cur: c.coins, target: 1000 }) },
  { id: "level5", icon: "⭐", test: (c) => c.level >= 5,
    progress: (c) => ({ cur: c.level, target: 5 }) },
];

export function computeAchievements(ctx) {
  return ACHIEVEMENTS.map((a) => {
    const unlocked = a.test(ctx);
    const p = !unlocked && a.progress ? a.progress(ctx) : null;
    return { id: a.id, icon: a.icon, unlocked, progress: p };
  });
}

// 把每个「有专注记录」的场景变成一条技能线；未归类的汇成「自由探索」。
// 0 经验的场景（建了但没在其下专注过）不出现在列表，改由 lockedCount 计数提示。
// 按经验从高到低排序。
/** @param {FocusRecord[]} records @param {Scenario[]} scenarios */
export function computeSkills(records, scenarios = []) {
  const skills = [];
  let lockedCount = 0;

  for (const s of scenarios) {
    const secs = totalFocusSecs(records.filter((r) => r.scenarioId === s.id));
    if (secs <= 0) {
      lockedCount += 1;
      continue;
    }
    skills.push({ id: s.id, title: s.title, icon: iconForId(s.id), secs, ...levelFromXp(secs) });
  }

  const looseSecs = totalFocusSecs(records.filter((r) => !r.scenarioId));
  if (looseSecs > 0) {
    skills.push({
      id: "__unclassified__",
      title: null, // UI 侧用 i18n 文案渲染
      icon: "✨",
      unclassified: true,
      secs: looseSecs,
      ...levelFromXp(looseSecs),
    });
  }

  skills.sort((a, b) => b.xp - a.xp);
  return { skills, lockedCount };
}

// 聚合出完整角色卡。组件侧只需一次 useMemo 调用本函数。
/** @param {{ records?: FocusRecord[], scenarios?: Scenario[], coins?: number, todos?: Todo[] }} input */
export function computeCharacter(
  { records = [], scenarios = [], coins = 0, todos = [] } = {},
  now = Date.now(),
) {
  const metrics = computeMetrics({ records, todos });
  const xpBreakdown = computeXpBreakdown(metrics);
  const core = levelFromXp(xpBreakdown.total);
  const streak = computeStreak(records, now);
  const { skills, lockedCount } = computeSkills(records, scenarios);

  return {
    ...core,
    rank: rankForLevel(core.level),
    coins,
    streak,
    sessionCount: metrics.sessionCount,
    metrics,
    xpBreakdown,
    attributes: computeAttributes(metrics),
    skills,
    lockedSkillCount: lockedCount,
    achievements: computeAchievements({ metrics, level: core.level, coins, streak }),
  };
}

// 单次会话的收益结算（专注结束叙事卡用）。基于「结算前」的角色快照 + 本次会话事实，
// 算出本次赚得的金币 / 经验来源 / 是否升级 / 连续天数。纯函数，便于单测。
//   prevRecords —— 结算前的历史记录（用于判断今天是否首次专注、以及连续天数）。
//   prevXp / prevLevel —— 结算前 computeCharacter 得到的总经验与等级。
//   completedTasks —— 本次会话里真正被打上勾的任务数。必须传：主经验条把
//     「完成任务」也算成一项（computeXpBreakdown 的 tasks 源），漏掉它，卡上报的
//     gainedXp 就比角色卡下一次算出来的少一截，leveledUp 在临界点还会漏报升级。
/** @param {{ durationSecs?: number, distractionCount?: number, completedTasks?: number, prevRecords?: FocusRecord[], prevXp?: number, prevLevel?: number, now?: number }} input */
export function computeSessionReward({
  durationSecs = 0,
  distractionCount = 0,
  completedTasks = 0,
  prevRecords = [],
  prevXp = 0,
  prevLevel = 0,
  now = Date.now(),
} = {}) {
  const secs = Math.max(0, Math.floor(durationSecs));
  const tasksDone = Math.max(0, Math.floor(completedTasks));
  const today = dayStart(now);
  const isFirstToday = !prevRecords.some((r) => dayStart(r.startedAt) === today);

  const focusXp = secs;
  const taskXp = tasksDone * XP_PER_TASK;
  const dayXp = isFirstToday ? XP_PER_FOCUS_DAY : 0;
  const cleanXp = distractionCount === 0 && secs > 0 ? XP_PER_CLEAN_SESSION : 0;
  const gainedXp = focusXp + taskXp + dayXp + cleanXp;

  // 顺序与 computeXpBreakdown 的 sources 一致（focus / tasks / days / clean）
  const sources = [{ key: "focus", icon: "⏱️", xp: focusXp }];
  if (taskXp) sources.push({ key: "tasks", icon: "✅", xp: taskXp });
  if (dayXp) sources.push({ key: "days", icon: "📅", xp: dayXp });
  if (cleanXp) sources.push({ key: "clean", icon: "🧘", xp: cleanXp });

  const after = levelFromXp(prevXp + gainedXp);
  // 把本次（now）算作一个专注日再求连续天数，得到「结算后」的 streak。
  const streak = computeStreak([{ startedAt: now }, ...prevRecords], now);

  return {
    durationSecs: secs,
    coins: focusXp,
    completedTasks: tasksDone,
    gainedXp,
    sources,
    prevLevel,
    newLevel: after.level,
    leveledUp: after.level > prevLevel,
    rank: rankForLevel(after.level),
    level: after.level,
    progress: after.progress,
    xpIntoLevel: after.xpIntoLevel,
    xpForNextLevel: after.xpForNextLevel,
    streak,
    distractionCount,
  };
}
