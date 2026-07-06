// 「今日委托」的数据层（纯数据、与 React 无关，便于复用与单测）。
//
// 借二游「每日委托」的形，去掉它的钩子：这里没有连续签到、没有 X/Y 计数、没有 FOMO 过期，
// 跳过任何一个都无损。每条委托都由「今天的专注记录」自动判定完成——做到了就温柔地庆祝，
// 没做也只是一个轻轻的邀请，不催促、不惩罚。契合 [[adhd-no-judgmental-numbers]]。

// 委托池：check 只吃「今天」聚合出的事实。icon 用 emoji，与全 app 风格一致。
export const COMMISSIONS = [
  { id: "showUp",  icon: "🌱", check: (s) => s.sessions >= 1 },
  { id: "clean",   icon: "🧘", check: (s) => s.cleanSessions >= 1 },
  { id: "explore", icon: "🧭", check: (s) => s.scenarioSessions >= 1 },
  { id: "settle",  icon: "🌊", check: (s) => s.longestSecs >= 15 * 60 },
  { id: "gather",  icon: "✨", check: (s) => s.totalSecs >= 25 * 60 },
];

// 把「今天」的专注记录按会话聚合成一组事实（秒数取 max、分心取 max，与角色系统口径一致）。
export function todayStats(records, now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dayStartMs = start.getTime();

  const map = new Map();
  for (const r of records || []) {
    if (!r || r.startedAt == null || r.startedAt < dayStartMs) continue;
    const k = r.sessionId ?? r.id;
    const cur = map.get(k) ?? { secs: 0, distractions: 0, scenarioId: null };
    cur.secs = Math.max(cur.secs, r.durationSecs || 0);
    cur.distractions = Math.max(cur.distractions, r.distractionCount ?? 0);
    if (r.scenarioId) cur.scenarioId = r.scenarioId;
    map.set(k, cur);
  }
  const sessions = [...map.values()];

  return {
    sessions: sessions.length,
    cleanSessions: sessions.filter((x) => x.distractions === 0).length,
    scenarioSessions: sessions.filter((x) => x.scenarioId).length,
    longestSecs: sessions.reduce((m, x) => Math.max(m, x.secs), 0),
    totalSecs: sessions.reduce((sum, x) => sum + x.secs, 0),
  };
}

// 按「当天日期」确定性地选出 n 条委托：同一天永远一样（不会刷新时乱跳），
// 换一天换一组。种子只用年月日，与时刻无关。
export function pickDailyCommissions(now = Date.now(), n = 3) {
  const d = new Date(now);
  let x = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) & 0x7fffffff;
  const rnd = () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
  const arr = COMMISSIONS.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}
