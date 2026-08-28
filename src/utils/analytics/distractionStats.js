// 分心统计页的纯函数层：把原始分心记录 + 专注记录压成页面直接可渲染的数字。
// 与 React 无关，便于单测。按小时的高峰分布复用 analyticsUtils.distractionByHour。
/** @import { DistractionRecord, FocusRecord } from '@/types' */

// 每个 sessionId 的墙钟时长（同一会话多任务时取最长的那条，避免重复累加）。
/** @param {FocusRecord[]} focusRecords */
export function sessionDurationMap(focusRecords) {
  const map = {};
  for (const r of focusRecords) {
    if (!r.sessionId) continue;
    map[r.sessionId] = Math.max(map[r.sessionId] ?? 0, r.durationSecs);
  }
  return map;
}

/**
 * 总览数字。分心率的分母只算「记录过分心的会话」的时长——
 * 把从没打开过分心按钮的会话也摊进来只会让数字失真。
 * @param {DistractionRecord[]} distractions
 * @param {Record<string, number>} durationBySession
 */
export function distractionOverview(distractions, durationBySession) {
  const sessionIds = new Set();
  let proactiveCount = 0;
  let proactiveSecs = 0;
  // 桌面端自动记的「切去别的软件」（type: "app"）单独算一组：
  // 它跟主动暂停一样会停表，但不是用户自己按下的，混在一起会看不出区别。
  let appCount = 0;
  let appSecs = 0;
  // type: "page"：沉浸专注里翻应用内别的页面。现已不算分心、不再新增，
  // 这一组只为已存在的旧记录保留。
  let pageCount = 0;
  let pageSecs = 0;

  for (const d of distractions) {
    if (d.sessionId) sessionIds.add(d.sessionId);
    if (d.type === "proactive") {
      proactiveCount++;
      proactiveSecs += d.durationSecs ?? 0;
    } else if (d.type === "app") {
      appCount++;
      appSecs += d.durationSecs ?? 0;
    } else if (d.type === "page") {
      pageCount++;
      pageSecs += d.durationSecs ?? 0;
    }
  }

  let focusSecs = 0;
  for (const id of sessionIds) focusSecs += durationBySession[id] ?? 0;

  const total = distractions.length;
  return {
    total,
    sessionCount: sessionIds.size,
    proactiveCount,
    proactiveSecs,
    appCount,
    appSecs,
    pageCount,
    pageSecs,
    avgPerSession: sessionIds.size > 0 ? total / sessionIds.size : 0,
    ratePerHour: focusSecs > 0 ? total / (focusSecs / 3600) : null,
    focusSecs,
  };
}

// 没打标签的分心归到这个哨兵 key，页面上单独显示成「未标注」。
export const UNTAGGED = "__untagged__";

/** @param {DistractionRecord[]} distractions */
export function distractionTagRanking(distractions) {
  const counts = {};
  for (const d of distractions) {
    const key = d.tag || UNTAGGED;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        // 次数相同时把「未标注」压到最后
        (a.tag === UNTAGGED ? 1 : b.tag === UNTAGGED ? -1 : 0),
    );
}

/**
 * 近 N 天每天的分心次数，按日期升序，缺数据的那天补 0。
 * @param {DistractionRecord[]} distractions
 */
export function distractionDailyTrend(distractions, days = 7, now = Date.now()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const slots = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    slots.push({ ts: d.getTime(), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
  }

  const byTs = new Map(slots.map((s) => [s.ts, s]));
  for (const item of distractions) {
    const d = new Date(item.ts);
    d.setHours(0, 0, 0, 0);
    const slot = byTs.get(d.getTime());
    if (slot) slot.count++;
  }
  return slots;
}
