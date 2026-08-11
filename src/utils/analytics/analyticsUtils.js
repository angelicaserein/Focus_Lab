// 数据分析 —— 专注效率洞察的纯函数。与 React 无关。
/** @import { FocusRecord, DistractionRecord } from '@/types' */
import { sessionKey, sessionMaxSecsMap } from "@/utils/records/focusRecords";

// ── 1. 按小时聚合专注数据 (返回 hours[0..23]) ──────────────────────────────
/** @param {FocusRecord[]} records */
export function hourlyFocusData(records) {
  const slots = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    sessionMaxSecs: new Map(), // sessionId → 墙钟时长（避免多任务重复累加）
    completedCount: 0,
    totalCount: 0,
  }));

  for (const r of records) {
    const hour = new Date(r.startedAt).getHours();
    const slot = slots[hour];
    const key = sessionKey(r);
    slot.sessionMaxSecs.set(key, Math.max(slot.sessionMaxSecs.get(key) ?? 0, r.durationSecs));
    slot.totalCount++;
    if (r.outcome === "completed") slot.completedCount++;
  }

  return slots.map((slot) => {
    let totalSecs = 0;
    for (const s of slot.sessionMaxSecs.values()) totalSecs += s;
    return {
      hour: slot.hour,
      sessionCount: slot.sessionMaxSecs.size,
      totalSecs,
      completedCount: slot.completedCount,
      totalCount: slot.totalCount,
      completionRate: slot.totalCount > 0 ? slot.completedCount / slot.totalCount : 0,
    };
  });
}

// ── 2. 时间段定义与聚合 ────────────────────────────────────────────────────
// labelKey 是 i18n key（见 i18n/analytics.js），不是可直接显示的文案——
// 这里是纯函数层，不该知道当前语言，交给页面 t() 出来。
export const TIME_BLOCKS = [
  { labelKey: "analytics.block.earlyMorning", range: [6, 9] },
  { labelKey: "analytics.block.morning",      range: [9, 12] },
  { labelKey: "analytics.block.noon",         range: [12, 15] },
  { labelKey: "analytics.block.afternoon",    range: [15, 18] },
  { labelKey: "analytics.block.evening",      range: [18, 21] },
  { labelKey: "analytics.block.lateNight",    range: [21, 24] },
  { labelKey: "analytics.block.dawn",         range: [0, 6] },
];

// 返回有数据的时间段，按 totalSecs 降序
export function timeBlockStats(hourlyData) {
  return TIME_BLOCKS.map((block) => {
    const [start, end] = block.range;
    const slots = hourlyData.slice(start, end);
    const totalSecs = slots.reduce((s, h) => s + h.totalSecs, 0);
    const sessions = slots.reduce((s, h) => s + h.sessionCount, 0);
    const completedTasks = slots.reduce((s, h) => s + h.completedCount, 0);
    const totalTasks = slots.reduce((s, h) => s + h.totalCount, 0);
    return {
      ...block,
      totalSecs,
      sessions,
      completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
    };
  })
    .filter((b) => b.sessions > 0)
    .sort((a, b) => b.totalSecs - a.totalSecs);
}

// ── 3. 专注时长分布（按会话去重） ─────────────────────────────────────────
export const DURATION_BUCKETS = [
  { labelKey: "analytics.bucket.under15", min: 0,    max: 900 },
  { labelKey: "analytics.bucket.15to30",  min: 900,  max: 1800 },
  { labelKey: "analytics.bucket.30to60",  min: 1800, max: 3600 },
  { labelKey: "analytics.bucket.1to2h",   min: 3600, max: 7200 },
  { labelKey: "analytics.bucket.over2h",  min: 7200, max: Infinity },
];

/** @param {FocusRecord[]} records */
export function sessionDurationBuckets(records) {
  const counts = new Array(DURATION_BUCKETS.length).fill(0);
  for (const secs of sessionMaxSecsMap(records).values()) {
    const idx = DURATION_BUCKETS.findIndex((b) => secs >= b.min && secs < b.max);
    if (idx >= 0) counts[idx]++;
  }
  return DURATION_BUCKETS.map((b, i) => ({ ...b, count: counts[i] }));
}

// ── 4. 任务榜：投入时长 + 完成率合成一张表 ────────────────────────────────
// 从前这里是两张表：历史页按时长排的「任务专注排行」、分析页按未完成率排的「难度榜」，
// 同一批任务被并排列两遍。现在合成一张，按投入时长排，完成率只作为同一行的一列。

// 完成率至少要这么多次出现才给出：只做过一次的任务恒为 0% 或 100%，没有参考价值。
const MIN_RATE_SAMPLES = 2;

/**
 * @param {FocusRecord[]} records 全部原始记录，用来数完成次数
 * @param {{text:string,totalSecs:number,sessions:number}[]} taskBreakdown
 *   computeFocusStats 已按时长排好序的任务榜，本函数只往每行补完成率
 */
export function mergeTaskTable(records, taskBreakdown) {
  const tally = new Map();
  for (const r of records) {
    // 无名任务统一归一到空串，显示时由页面 t("analytics.untitled") 补；
    // 这里塞中文字面量的话，切英文就会冒出一条中文行。
    const key = r.taskText || "";
    const hit = tally.get(key) ?? { total: 0, completed: 0 };
    hit.total += 1;
    if (r.outcome === "completed") hit.completed += 1;
    tally.set(key, hit);
  }

  return taskBreakdown.map((task) => {
    const hit = tally.get(task.text || "");
    const rate =
      hit && hit.total >= MIN_RATE_SAMPLES ? hit.completed / hit.total : null;
    return { ...task, completionRate: rate, hard: rate !== null && rate < 0.5 };
  });
}

// ── 5. 分心高峰（按小时） ─────────────────────────────────────────────────
/** @param {DistractionRecord[]} distractions */
export function distractionByHour(distractions) {
  const counts = new Array(24).fill(0);
  const tagTally = {};

  for (const d of distractions) {
    const hour = new Date(d.ts).getHours();
    counts[hour]++;
    if (d.tag) tagTally[d.tag] = (tagTally[d.tag] ?? 0) + 1;
  }

  const topTag =
    Object.entries(tagTally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    hourly: counts.map((count, hour) => ({ hour, count })),
    topTag,
    total: distractions.length,
  };
}
