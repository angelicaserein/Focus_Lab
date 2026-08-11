// 数据分析 —— 专注效率洞察的纯函数。与 React 无关。
/** @import { FocusRecord, DistractionRecord } from '@/types' */
import { sessionKey, sessionMaxSecsMap } from "@/utils/records/focusRecords";

// ── 1. 按小时聚合专注数据 (返回 hours[0..23]) ──────────────────────────────
/** @param {FocusRecord[]} records */
export function hourlyFocusData(records) {
  const slots = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    sessionMaxSecs: new Map(), // sessionId → 墙钟时长（避免多任务重复累加）
  }));

  for (const r of records) {
    const hour = new Date(r.startedAt).getHours();
    const slot = slots[hour];
    const key = sessionKey(r);
    slot.sessionMaxSecs.set(key, Math.max(slot.sessionMaxSecs.get(key) ?? 0, r.durationSecs));
  }

  return slots.map((slot) => {
    let totalSecs = 0;
    for (const s of slot.sessionMaxSecs.values()) totalSecs += s;
    return {
      hour: slot.hour,
      sessionCount: slot.sessionMaxSecs.size,
      totalSecs,
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
    return { ...block, totalSecs, sessions };
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

// ── 4. 分心高峰（按小时） ─────────────────────────────────────────────────
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
