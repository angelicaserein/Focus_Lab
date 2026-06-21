// 数据分析 —— 专注效率洞察的纯函数。与 React 无关。

// ── 1. 按小时聚合专注数据 (返回 hours[0..23]) ──────────────────────────────
export function hourlyFocusData(records) {
  const slots = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    sessionMaxSecs: new Map(), // sessionId → 墙钟时长（避免多任务重复累加）
    completedCount: 0,
    totalCount: 0,
  }));

  for (const r of records) {
    const hour = r.startedAt ? new Date(r.startedAt).getHours() : NaN;
    const slot = slots[hour];
    if (!slot) continue;
    const key = r.sessionId ?? r.id;
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
export const TIME_BLOCKS = [
  { label: "早晨", range: [6, 9] },
  { label: "上午", range: [9, 12] },
  { label: "午后", range: [12, 15] },
  { label: "下午", range: [15, 18] },
  { label: "晚上", range: [18, 21] },
  { label: "深夜", range: [21, 24] },
  { label: "凌晨", range: [0, 6] },
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
export function sessionDurationBuckets(records) {
  const buckets = [
    { label: "< 15分钟", min: 0, max: 900 },
    { label: "15–30分", min: 900, max: 1800 },
    { label: "30–60分", min: 1800, max: 3600 },
    { label: "1–2小时", min: 3600, max: 7200 },
    { label: "> 2小时", min: 7200, max: Infinity },
  ];

  const sessionMap = new Map();
  for (const r of records) {
    const key = r.sessionId ?? r.id;
    sessionMap.set(key, Math.max(sessionMap.get(key) ?? 0, r.durationSecs));
  }

  const counts = new Array(buckets.length).fill(0);
  for (const secs of sessionMap.values()) {
    const idx = buckets.findIndex((b) => secs >= b.min && secs < b.max);
    if (idx >= 0) counts[idx]++;
  }

  return buckets.map((b, i) => ({ ...b, count: counts[i] }));
}

// ── 4. 任务难度排行（按未完成率从高到低，≥ minN 次才统计） ─────────────────
export function taskDifficultyRanking(records, minN = 2) {
  const map = {};
  for (const r of records) {
    const key = r.taskText || "(未命名)";
    if (!map[key]) map[key] = { text: key, total: 0, completed: 0 };
    map[key].total++;
    if (r.outcome === "completed") map[key].completed++;
  }

  return Object.values(map)
    .filter((t) => t.total >= minN)
    .map((t) => ({ ...t, failRate: 1 - t.completed / t.total }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 10);
}

// ── 5. 分心高峰（按小时） ─────────────────────────────────────────────────
export function distractionByHour(distractions) {
  const counts = new Array(24).fill(0);
  const tagTally = {};

  for (const d of distractions) {
    if (!d.ts) continue;
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
