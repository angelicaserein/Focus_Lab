// 日历页的纯排版层：月历网格 + 当日时刻轨道的几何计算。
// 全部为纯函数、不依赖 React，便于单测，也让 index.jsx 专注于渲染与交互。
import {
  totalFocusSecs,
  groupBySession,
} from "@/utils/records/focusRecords";

// 一日时间轨道的排版常量
export const HOUR_PX = 62;            // 每小时轨道高度
const PX_PER_MIN = HOUR_PX / 60;
const MIN_BLOCK_PX = 54;              // 短会话的最小可读高度

// 本地日历键 "YYYY-MM-DD"（避开 UTC 偏移）
export function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 专注热度分级，和主页热力图口径一致
function heatLevel(secs) {
  if (secs === 0) return 0;
  if (secs < 25 * 60) return 1;
  if (secs < 60 * 60) return 2;
  if (secs < 120 * 60) return 3;
  return 4;
}

// 按本地日期把记录分组：key → records[]
export function groupRecordsByDay(records) {
  const map = new Map();
  for (const r of records) {
    const key = dayKey(new Date(r.startedAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return map;
}

// 构建覆盖整月的 6×7 网格，从包含 1 号的那一周的周一开始
export function buildMonthGrid(year, month, dayMap, todayKey) {
  const first = new Date(year, month, 1);
  const dow = (first.getDay() + 6) % 7; // 周一=0
  const start = new Date(year, month, 1 - dow);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = dayKey(date);
    const recs = dayMap.get(key) ?? [];
    const secs = totalFocusSecs(recs);
    const weekday = (date.getDay() + 6) % 7;
    cells.push({
      date,
      key,
      inMonth: date.getMonth() === month,
      isToday: key === todayKey,
      isWeekend: weekday >= 5,
      secs,
      level: heatLevel(secs),
      sessionCount: new Set(recs.map((r) => r.sessionId ?? r.id)).size,
    });
  }
  return cells;
}

// 会话整体基调：只要有一项完成即视为完成，全部移除记为移除，其余记结束
function sessionTone(outcomes) {
  if (outcomes.includes("completed")) return "completed";
  if (outcomes.length > 0 && outcomes.every((o) => o === "removed")) return "removed";
  return "ended";
}

// 把某天记录整理成"时刻轨道"所需的排版数据
export function buildDayView(records, isToday) {
  const raw = groupBySession(records)
    .map((s) => {
      const taskMap = new Map();
      let coins = 0;
      let distractions = 0;
      let scenarioTitle;
      for (const r of s.records) {
        if (!taskMap.has(r.taskText)) taskMap.set(r.taskText, r.outcome);
        coins += r.coinsEarned ?? 0;
        distractions += r.distractionCount ?? 0;
        if (!scenarioTitle && r.scenarioTitle) scenarioTitle = r.scenarioTitle;
      }
      const tasks = [...taskMap.entries()].map(([text, outcome]) => ({ text, outcome }));
      return {
        key: s.key,
        startMs: s.startedAt,
        endMs: s.startedAt + s.totalSecs * 1000,
        totalSecs: s.totalSecs,
        tasks,
        tone: sessionTone(tasks.map((t) => t.outcome)),
        coins,
        distractions,
        scenarioTitle,
      };
    })
    .sort((a, b) => a.startMs - b.startMs);

  if (raw.length === 0) return { sessions: [], hours: [], height: 0, nowTop: null };

  // 轨道时间范围：覆盖所有会话的整点区间，至少 2 小时
  const startHour = new Date(Math.min(...raw.map((s) => s.startMs))).getHours();
  let endHour = new Date(Math.max(...raw.map((s) => s.endMs))).getHours();
  if (new Date(Math.max(...raw.map((s) => s.endMs))).getMinutes() > 0) endHour += 1;
  endHour = Math.min(24, Math.max(endHour, startHour + 2));

  const dayStart = new Date(raw[0].startMs);
  dayStart.setHours(startHour, 0, 0, 0);
  const rangeStartMs = dayStart.getTime();
  const totalMin = (endHour - startHour) * 60;

  // 贪心分道：同一时间重叠的会话分到不同列
  const laneEnds = []; // 每条道当前的"占用到"分钟
  const sessions = raw.map((s) => {
    const topMin = (s.startMs - rangeStartMs) / 60000;
    const rawH = (s.totalSecs / 60) * PX_PER_MIN;
    const height = Math.max(rawH, MIN_BLOCK_PX);
    const occupyEndMin = topMin + height / PX_PER_MIN; // 含最小高度的实际占用
    let lane = laneEnds.findIndex((e) => e <= topMin + 0.001);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(occupyEndMin);
    } else {
      laneEnds[lane] = occupyEndMin;
    }
    return { ...s, top: topMin * PX_PER_MIN, height, lane };
  });

  const lanes = laneEnds.length;
  const hours = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  let nowTop = null;
  if (isToday) {
    const now = new Date();
    const nowMin = (now.getTime() - rangeStartMs) / 60000;
    if (nowMin >= 0 && nowMin <= totalMin) nowTop = nowMin * PX_PER_MIN;
  }

  return {
    sessions: sessions.map((s) => ({ ...s, lanes })),
    hours,
    height: totalMin * PX_PER_MIN,
    startHour,
    nowTop,
  };
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
