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

import { buildSortWeightMap } from "@/utils/task/taskAttrUtils";

// ── 可调权重（集中放顶部，便于实验迭代）─────────────────────────
const TAG_MATCH = 40; // 任务标签命中当前情景任务类型
const TAG_MISMATCH = -15; // 有标签但全不命中（明显属于别的情景）
const PRIORITY_FACTOR = 8; // 乘以 sortWeight（1..4）→ 低 8 / 紧急 32
const DUE_OVERDUE = 35;
const DUE_TODAY = 30;
const DUE_SOON = 20; // ≤2 天
const DUE_WEEK = 8; // ≤7 天
const ENV_FIT = 15; // estimatedMins 契合环境时长偏好
const ENV_MISFIT = -10; // estimatedMins 与环境明显不符

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
    return { preferredDuration: "long", label: "适合深度工作" };
  }
  if (phoneOnly) {
    return { preferredDuration: "short", label: "适合碎片任务" };
  }
  return { preferredDuration: "any", label: "" };
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
  if (days === null) return { delta: 0, label: "" };
  if (days < 0) return { delta: DUE_OVERDUE, label: "已逾期" };
  if (days === 0) return { delta: DUE_TODAY, label: "今天截止" };
  if (days <= 2) return { delta: DUE_SOON, label: "即将截止" };
  if (days <= 7) return { delta: DUE_WEEK, label: "本周截止" };
  return { delta: 0, label: "" };
}

// estimatedMins 与环境时长偏好的契合度。
function scoreEnvFit(estimatedMins, preferredDuration) {
  if (preferredDuration === "any" || estimatedMins == null) {
    return { delta: 0, label: "" };
  }
  if (preferredDuration === "long") {
    if (estimatedMins >= 25) return { delta: ENV_FIT, label: "适合此刻深度投入" };
    if (estimatedMins < 10) return { delta: ENV_MISFIT, label: "" };
    return { delta: 0, label: "" };
  }
  // short
  if (estimatedMins <= 15) return { delta: ENV_FIT, label: "短任务正合适" };
  if (estimatedMins > 45) return { delta: ENV_MISFIT, label: "" };
  return { delta: 0, label: "" };
}

// ── 单任务打分 ───────────────────────────────────────────────

// ctx: { taskTypes: string[], envProfile, prioritySortMap, priorityLabels }
// 返回 { todo, score, reasons:[{ key, label, delta }] }，reasons 仅收正向理由供 UI 解释。
export function scoreTask(todo, ctx, now) {
  const { taskTypes = [], envProfile, prioritySortMap = {}, priorityLabels = {} } = ctx;
  const attrs = todo.attrs ?? {};
  let score = 0;
  const reasons = [];
  const push = (key, label, delta) => {
    if (delta > 0 && label) reasons.push({ key, label, delta });
  };

  // 1. taskType 匹配
  const tags = attrs.tags ?? [];
  if (taskTypes.length && tags.length) {
    const hit = tags.some((t) => taskTypes.includes(t));
    if (hit) {
      score += TAG_MATCH;
      push("tag", "契合当前情景", TAG_MATCH);
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
    if (weight >= 3 && label) push("priority", `${label}优先级`, delta);
  }

  // 3. 截止临近度
  const due = scoreDue(daysUntil(attrs.dueDate, now));
  score += due.delta;
  push("due", due.label, due.delta);

  // 4. 环境时长契合
  const env = scoreEnvFit(attrs.estimatedMins, envProfile?.preferredDuration ?? "any");
  score += env.delta;
  push("env", env.label, env.delta);

  return { todo, score, reasons };
}

// ── 上下文构建 ───────────────────────────────────────────────

// 由情景 + priority 列定义构建打分上下文（供组件 useMemo 缓存）。
export function buildScenarioContext(scenario, priorityAttr) {
  const settings = scenario?.settings ?? {};
  const priorityLabels = Object.fromEntries(
    (priorityAttr?.options ?? []).map((o) => [o.id, o.label]),
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
