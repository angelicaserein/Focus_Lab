// 专注记录的纯数据处理 —— 分组、近 7 天聚合、统计汇总。
// 与 React 无关，便于复用与单测。

// 结果徽章元信息（History 渲染用）
export const OUTCOME_META = {
  completed: { label: "完成", cls: "completed" },
  removed: { label: "移除", cls: "removed" },
  ended: { label: "结束", cls: "ended" },
};

// 按自然日分组，返回 [dayLabel, records][]
export function groupByDay(records) {
  const groups = {};
  for (const r of records) {
    const key = new Date(r.startedAt).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.entries(groups);
}

// 把一天内的记录按 sessionId 归成「一次专注」；旧记录无 sessionId 时各自独立成组
export function groupBySession(records) {
  const sessions = [];
  const byId = new Map();
  for (const r of records) {
    const key = r.sessionId ?? r.id;
    if (!byId.has(key)) {
      const session = { key, records: [], startedAt: r.startedAt, totalSecs: 0 };
      byId.set(key, session);
      sessions.push(session);
    }
    const session = byId.get(key);
    session.records.push(r);
    session.totalSecs += r.durationSecs;
    session.startedAt = Math.min(session.startedAt, r.startedAt);
  }
  return sessions;
}

// 近 7 天每日专注时长（今天在最右），返回 [{ label, totalSecs }]
export function last7DaysData(records) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const label = i === 0 ? "今天" : `${d.getMonth() + 1}/${d.getDate()}`;
    const totalSecs = records
      .filter((r) => r.startedAt >= d.getTime() && r.startedAt < nextD.getTime())
      .reduce((sum, r) => sum + r.durationSecs, 0);
    days.push({ label, totalSecs });
  }
  return days;
}

// 汇总 History 顶部所有统计指标，组件侧只需一个 useMemo 调用本函数。
export function computeFocusStats(records) {
  const totalSecs = records.reduce((s, r) => s + r.durationSecs, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySecs = records
    .filter((r) => r.startedAt >= todayStart.getTime())
    .reduce((s, r) => s + r.durationSecs, 0);

  // 一次会话算一次专注（多任务共用一个 sessionId）；旧记录无 sessionId 各算一次
  const sessionCount = new Set(records.map((r) => r.sessionId ?? r.id)).size;

  const longestSecs = records.reduce((max, r) => Math.max(max, r.durationSecs), 0);
  const avgSecs = records.length > 0 ? Math.round(totalSecs / records.length) : 0;

  const breakdownMap = {};
  for (const r of records) {
    const key = r.taskText;
    if (!breakdownMap[key]) breakdownMap[key] = { text: r.taskText, totalSecs: 0, sessions: 0 };
    breakdownMap[key].totalSecs += r.durationSecs;
    breakdownMap[key].sessions += 1;
  }
  const taskBreakdown = Object.values(breakdownMap)
    .sort((a, b) => b.totalSecs - a.totalSecs)
    .slice(0, 6);

  const chartData = last7DaysData(records);

  return {
    totalSecs,
    todaySecs,
    sessionCount,
    longestSecs,
    avgSecs,
    taskBreakdown,
    chartData,
  };
}
