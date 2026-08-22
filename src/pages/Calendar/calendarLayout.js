// 日历页的纯排版层：月历网格 + 当日时刻轨道的几何计算。
// 全部为纯函数、不依赖 React，便于单测，也让 index.jsx 专注于渲染与交互。
import {
  totalFocusSecs,
  groupBySession,
} from "@/utils/records/focusRecords";
import { clusterActivities, countByType } from "@/utils/records/activityLog";

// 一日时间轨道的排版常量
export const HOUR_PX = 62;            // 每小时轨道高度
const PX_PER_MIN = HOUR_PX / 60;
const MIN_BLOCK_PX = 54;              // 短会话的最小可读高度
const MARK_GAP_PX = 26;               // 使用记录条目之间的最小间距（挤在一起时顺次下推）

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

// 按本地日期把使用记录分组：key → activities[]
export function groupActivitiesByDay(activities) {
  const map = new Map();
  for (const a of activities) {
    const key = dayKey(new Date(a.ts));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(a);
  }
  return map;
}

// 单个日期格的数据。month 传 null 表示"不区分本月"（周条模式下整行都算当期）
function buildCell(date, month, dayMap, todayKey, actMap) {
  const key = dayKey(date);
  const recs = dayMap.get(key) ?? [];
  const secs = totalFocusSecs(recs);
  const weekday = (date.getDay() + 6) % 7;
  return {
    date,
    key,
    inMonth: month == null || date.getMonth() === month,
    isToday: key === todayKey,
    isWeekend: weekday >= 5,
    secs,
    level: heatLevel(secs),
    sessionCount: new Set(recs.map((r) => r.sessionId ?? r.id)).size,
    // 没专注但有动作的日子也要看得见（点了完成 / 加了任务）
    actCount: (actMap.get(key) ?? []).length,
  };
}

// 某日所在周的周一（本地零点）
export function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

// 构建覆盖整月的 6×7 网格，从包含 1 号的那一周的周一开始
export function buildMonthGrid(year, month, dayMap, todayKey, actMap = new Map()) {
  const first = new Date(year, month, 1);
  const dow = (first.getDay() + 6) % 7; // 周一=0
  const start = new Date(year, month, 1 - dow);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push(buildCell(date, month, dayMap, todayKey, actMap));
  }
  return cells;
}

// 收起态的一行七格：从 weekStart（周一）起的一周，整行都不置灰
export function buildWeekRow(weekStart, dayMap, todayKey, actMap = new Map()) {
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(
      weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i,
    );
    cells.push(buildCell(date, null, dayMap, todayKey, actMap));
  }
  return cells;
}

// 日历格里的极简时长："25m" / "1h20" / "3h"，不足 1 分钟不显示
export function formatCellDuration(secs) {
  if (!secs || secs < 60) return "";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

// 会话整体基调：只要有一项完成即视为完成，全部移除记为移除，其余记结束
function sessionTone(outcomes) {
  if (outcomes.includes("completed")) return "completed";
  if (outcomes.length > 0 && outcomes.every((o) => o === "removed")) return "removed";
  return "ended";
}

// 把某天记录整理成"时刻轨道"所需的排版数据。
// activities 是当天的使用记录（加/完成/删任务），它们没有时长，只在轨道右侧点出时刻。
export function buildDayView(records, isToday, activities = []) {
  const raw = groupBySession(records)
    .map((s) => {
      const taskMap = new Map();
      // coins / distractions 是**会话级**数字，结算时被原样复制到本会话的每条
      // 任务记录上（见 hooks/session/useSessionStop）。所以这里必须取 max 而不是
      // 求和 —— 求和会让一次三任务的专注显示成三倍金币、三倍分心。
      // 口径与 focusRecords.sessionMaxSecsMap / characterUtils.aggregateSessions 一致。
      let coins = 0;
      let distractions = 0;
      let scenarioTitle;
      for (const r of s.records) {
        if (!taskMap.has(r.taskText)) taskMap.set(r.taskText, r.outcome);
        coins = Math.max(coins, r.coinsEarned ?? 0);
        distractions = Math.max(distractions, r.distractionCount ?? 0);
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

  const clusters = clusterActivities(activities);

  if (raw.length === 0 && clusters.length === 0) {
    return { sessions: [], marks: [], counts: {}, hours: [], height: 0, nowTop: null };
  }

  // 轨道时间范围：覆盖所有会话与使用记录的整点区间，至少 2 小时
  const firstMs = Math.min(...raw.map((s) => s.startMs), ...clusters.map((m) => m.ts));
  const lastMs = Math.max(...raw.map((s) => s.endMs), ...clusters.map((m) => m.ts));
  const startHour = new Date(firstMs).getHours();
  let endHour = new Date(lastMs).getHours();
  if (new Date(lastMs).getMinutes() > 0) endHour += 1;
  endHour = Math.min(24, Math.max(endHour, startHour + 2));

  const dayStart = new Date(firstMs);
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

  // 使用记录：按时刻定位在右侧栏；同一时刻挤在一起时顺次下推，保证读得清。
  let prevBottom = -Infinity;
  const marks = clusters.map((c) => {
    const exactTop = ((c.ts - rangeStartMs) / 60000) * PX_PER_MIN;
    const top = Math.max(exactTop, prevBottom);
    prevBottom = top + MARK_GAP_PX;
    return { ...c, top, exactTop, shifted: top - exactTop > 1 };
  });

  let nowTop = null;
  if (isToday) {
    const now = new Date();
    const nowMin = (now.getTime() - rangeStartMs) / 60000;
    if (nowMin >= 0 && nowMin <= totalMin) nowTop = nowMin * PX_PER_MIN;
  }

  // 记录被下推到时间范围之外时，轨道跟着长高，免得末尾几条溢出容器
  const height = Math.max(totalMin * PX_PER_MIN, prevBottom === -Infinity ? 0 : prevBottom);

  return {
    sessions: sessions.map((s) => ({ ...s, lanes })),
    marks,
    counts: countByType(activities),
    hours,
    height,
    startHour,
    nowTop,
  };
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
