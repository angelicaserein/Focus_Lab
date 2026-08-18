// ──────────────────────────────────────────────────────────────
//  情景智能推荐 —— 基于规则的纯函数打分器
//
//  与「当前情景过滤」并存：过滤是被动筛掉不相关任务，本模块是主动给当前
//  环境下「现在最适合做」的任务排序。打分维度（全部可调权重，见顶部常量）：
//    · taskType 匹配  —— 任务标签 ∩ 情景任务类型
//    · 优先级         —— 复用 priority 列的 sortWeight（urgent=4…low=1）
//    · 截止临近度     —— 越临近/逾期越靠前
//    · 环境时长契合   —— 「Paul 逻辑」：安静+电脑→偏深度长任务；只带手机→偏碎片短任务
//
//  全部纯函数、now 由调用方注入（便于 vitest 固定时间），不依赖 React。
// ──────────────────────────────────────────────────────────────

import { buildSortWeightMap, optionLabel } from "@/utils/task/taskAttrUtils";

// ── 可调权重（集中放顶部，便于实验迭代）─────────────────────────
const TAG_MATCH = 40; // 任务标签命中当前情景任务类型
const TAG_MISMATCH = -15; // 有标签但全不命中（明显属于别的情景）
const PRIORITY_FACTOR = 8; // 乘以 sortWeight（1..4）→ 低 8 / 紧急 32
const DUE_OVERDUE = 35;
const DUE_TODAY = 30;
const DUE_SOON = 20; // ≤2 天
const DUE_WEEK = 8; // ≤7 天

const MS_PER_DAY = 86_400_000;
const DEFAULT_LIMIT = 5;

// 默认 ID（与 scenarioConstants.js 一致）。选项可被用户自定义，故这里只把
// 「认识的」ID 纳入环境推断，未知 ID 一律退化为中性，避免对自定义选项瞎判。
const FOCUS_DEVICE_IDS = ["computer", "paper", "tablet"]; // 适合坐下来深度工作
const QUIET_COMM_IDS = ["silent", "textonly"];

// ── 环境画像 ─────────────────────────────────────────────────

// 从情景设置推断「当前环境偏好的任务时长」：
//   long —— 安静/只能文字 且 有桌面类设备 → 适合深度工作长任务
//   short —— 只带手机（无桌面类设备）→ 适合碎片化/事务短任务
//   any —— 信息不足或混合 → 不对时长作偏好
export function deriveEnvProfile(settings) {
  const devices = settings?.devices ?? [];
  const communication = settings?.communication ?? "";

  const hasFocusDevice = devices.some((d) => FOCUS_DEVICE_IDS.includes(d));
  const isQuiet = QUIET_COMM_IDS.includes(communication);
  const phoneOnly = devices.length > 0 && devices.every((d) => d === "phone");

  if (isQuiet && hasFocusDevice) {
    return { preferredDuration: "long", labelKey: "scenario.env.long" };
  }
  if (phoneOnly) {
    return { preferredDuration: "short", labelKey: "scenario.env.short" };
  }
  return { preferredDuration: "any", labelKey: "" };
}

// ── 单维度打分 helper ────────────────────────────────────────

// "YYYY-MM-DD" → 距 now 的天数（正=未来，0=今天，负=逾期）。可注入 now 便于测试。
function daysUntil(dueDate, now) {
  if (!dueDate) return null;
  const due = new Date(dueDate + "T00:00:00").getTime();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((due - start.getTime()) / MS_PER_DAY);
}

function scoreDue(days) {
  if (days === null) return { delta: 0, labelKey: "" };
  if (days < 0) return { delta: DUE_OVERDUE, labelKey: "scenario.due.overdue" };
  if (days === 0) return { delta: DUE_TODAY, labelKey: "scenario.due.today" };
  if (days <= 2) return { delta: DUE_SOON, labelKey: "scenario.due.soon" };
  if (days <= 7) return { delta: DUE_WEEK, labelKey: "scenario.due.week" };
  return { delta: 0, labelKey: "" };
}

// ── 单任务打分 ───────────────────────────────────────────────

// ctx: { taskTypes: string[], envProfile, prioritySortMap, priorityLabels }
// 返回 { todo, score, reasons:[{ key, labelKey, vars, delta }] }，reasons 仅收正向理由供 UI 解释。
// 理由只给 key，由 UI 层用 t() 取文案（优先级等名字以 vars 传入）。
export function scoreTask(todo, ctx, now) {
  const { taskTypes = [], prioritySortMap = {}, priorityLabels = {} } = ctx;
  const attrs = todo.attrs ?? {};
  let score = 0;
  const reasons = [];
  const push = (key, labelKey, delta, vars) => {
    if (delta > 0 && labelKey) reasons.push({ key, labelKey, vars, delta });
  };

  // 1. taskType 匹配
  const tags = attrs.tags ?? [];
  if (taskTypes.length && tags.length) {
    const hit = tags.some((t) => taskTypes.includes(t));
    if (hit) {
      score += TAG_MATCH;
      push("tag", "scenario.reason.tag", TAG_MATCH);
    } else {
      score += TAG_MISMATCH;
    }
  }

  // 2. 优先级
  const weight = prioritySortMap[attrs.priority] ?? 0;
  if (weight > 0) {
    const delta = weight * PRIORITY_FACTOR;
    score += delta;
    const label = priorityLabels[attrs.priority];
    if (weight >= 3 && label) push("priority", "scenario.reason.priority", delta, { label });
  }

  // 3. 截止临近度
  const due = scoreDue(daysUntil(attrs.dueDate, now));
  score += due.delta;
  push("due", due.labelKey, due.delta);

  return { todo, score, reasons };
}

// ── 上下文构建 ───────────────────────────────────────────────

// 由情景 + priority 列定义构建打分上下文（供组件 useMemo 缓存）。
export function buildScenarioContext(scenario, priorityAttr, t = (k) => k) {
  const settings = scenario?.settings ?? {};
  const priorityLabels = Object.fromEntries(
    (priorityAttr?.options ?? []).map((o) => [o.id, optionLabel(t, o)]),
  );
  return {
    taskTypes: settings.taskTypes ?? [],
    envProfile: deriveEnvProfile(settings),
    prioritySortMap: buildSortWeightMap(priorityAttr),
    priorityLabels,
  };
}

// ── 主入口 ───────────────────────────────────────────────────

// 排除已完成任务，按 score 降序（稳定）取前 limit 条。
// 返回 [{ todo, score, reasons }]。score 相等时保持输入相对顺序。
export function recommendTasks(todos, ctx, { now = Date.now(), limit = DEFAULT_LIMIT } = {}) {
  const scored = todos
    .filter((t) => !t.completed)
    .map((todo, index) => ({ ...scoreTask(todo, ctx, now), index }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map(({ todo, score, reasons }) => ({ todo, score, reasons }));
}
