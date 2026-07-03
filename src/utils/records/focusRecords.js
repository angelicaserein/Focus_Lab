// 专注记录的纯数据处理 —— 分组、近 7 天聚合、统计汇总。
// 与 React 无关，便于复用与单测。
/** @import { FocusRecord } from '@/types' */

// 会话唯一键：有 sessionId 时用它，旧记录无 sessionId 则退化到记录自身 id
export const sessionKey = (r) => r.sessionId ?? r.id;

// 从带 ts 的条目列表中筛出「本次会话」的子集（随记 / 分心共用）。
// sessionStartTs 为空（未开始）时返回空数组，避免把历史条目误算进本次。
export function filterSinceSession(items, sessionStartTs) {
  return sessionStartTs ? items.filter((x) => x.ts >= sessionStartTs) : [];
}

// 构造一条带会话归属的条目（随记 / 分心记录共用的公共字段）。
// extra 提供各自特有字段（如随记的 text、分心的 type/tag）。
export function makeSessionEntry(extra, { sessionId, focusedTodoIds }) {
  return {
    id: crypto.randomUUID(),
    ts: Date.now(),
    sessionId,
    taskIds: [...focusedTodoIds],
    ...extra,
  };
}

// 构造写入历史的 focus record（纯数据，副作用留在调用方）。
// startedAt 缺省时按 durationSecs 反推，兼容无会话起始时间的极端路径。
export function buildFocusRecord(todo, outcome, {
  durationSecs,
  startedAt,
  sessionId,
  scenarioId,
  scenarioTitle,
  coinsEarned,
  distractionCount,
  distractionSecs,
  noteCount,
  events,
}) {
  return {
    taskId: todo.id,
    taskText: todo.text,
    durationSecs,
    startedAt: startedAt ?? Date.now() - durationSecs * 1000,
    sessionId,
    outcome,
    scenarioId: scenarioId ?? undefined,
    scenarioTitle: scenarioTitle ?? undefined,
    coinsEarned,
    distractionCount,
    distractionSecs,
    noteCount,
    events,
  };
}

// 结果徽章元信息（History 渲染用）
export const OUTCOME_META = {
  completed: { label: "完成", cls: "completed" },
  removed: { label: "移除", cls: "removed" },
  ended: { label: "结束", cls: "ended" },
};

// 构建 sessionKey → 墙钟时长 映射。
// 计时器在一次会话内单调累计，最后结算的任务 durationSecs 代表整段时长；
// 取 max 而非 sum，避免多任务并行时重复累加（如 40s 两任务不应变 80s）。
/** @param {FocusRecord[]} records */
export function sessionMaxSecsMap(records) {
  const map = new Map();
  for (const r of records) {
    const key = sessionKey(r);
    map.set(key, Math.max(map.get(key) ?? 0, r.durationSecs));
  }
  return map;
}

// 所有记录的真实累计专注时长（按会话去重）
/** @param {FocusRecord[]} records @returns {number} */
export function totalFocusSecs(records) {
  let total = 0;
  for (const secs of sessionMaxSecsMap(records).values()) total += secs;
  return total;
}

// 按自然日分组，返回 [dayLabel, records][]
/** @param {FocusRecord[]} records */
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
/** @param {FocusRecord[]} records */
export function groupBySession(records) {
  const sessions = [];
  const byId = new Map();
  for (const r of records) {
    const key = sessionKey(r);
    if (!byId.has(key)) {
      const session = { key, records: [], startedAt: r.startedAt, totalSecs: 0 };
      byId.set(key, session);
      sessions.push(session);
    }
    const session = byId.get(key);
    session.records.push(r);
    // 会话墙钟时长取最大值，避免多任务并行重复累加
    session.totalSecs = Math.max(session.totalSecs, r.durationSecs);
    session.startedAt = Math.min(session.startedAt, r.startedAt);
  }
  return sessions;
}

// 近 7 天每日专注时长（今天在最右），返回 [{ label, totalSecs }]
const PAST_DAYS = 6; // 加上今天共 7 天

/** @param {FocusRecord[]} records */
export function last7DaysData(records) {
  const days = [];
  for (let i = PAST_DAYS; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const label = i === 0 ? "今天" : `${d.getMonth() + 1}/${d.getDate()}`;
    const totalSecs = totalFocusSecs(
      records.filter((r) => r.startedAt >= d.getTime() && r.startedAt < nextD.getTime()),
    );
    days.push({ label, totalSecs });
  }
  return days;
}

// 汇总 History 顶部所有统计指标，组件侧只需一个 useMemo 调用本函数。
/** @param {FocusRecord[]} records */
export function computeFocusStats(records) {
  // 累计/今日时长按会话墙钟去重（多任务并行不叠加）
  const totalSecs = totalFocusSecs(records);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySecs = totalFocusSecs(
    records.filter((r) => r.startedAt >= todayStart.getTime()),
  );

  // 一次会话算一次专注（多任务共用一个 sessionId）；旧记录无 sessionId 各算一次
  const sessionCount = new Set(records.map((r) => sessionKey(r))).size;

  const longestSecs = records.reduce((max, r) => Math.max(max, r.durationSecs), 0);
  // 平均按会话数为分母，口径与 totalSecs 一致（每次会话的平均墙钟时长）
  const avgSecs = sessionCount > 0 ? Math.round(totalSecs / sessionCount) : 0;

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
