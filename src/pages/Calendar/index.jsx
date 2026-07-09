import React, { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, Coins, Zap,
  Clock3, Flame, CalendarCheck,
} from "lucide-react";
import { useFocus } from "@/context/FocusContext";
import {
  totalFocusSecs,
  groupBySession,
  OUTCOME_META,
} from "@/utils/records/focusRecords";
import { formatDuration } from "@/utils/time";
import "./Calendar.css";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_NAMES = [
  "1 月", "2 月", "3 月", "4 月", "5 月", "6 月",
  "7 月", "8 月", "9 月", "10 月", "11 月", "12 月",
];

// 一日时间轨道的排版常量
const HOUR_PX = 62;            // 每小时轨道高度
const PX_PER_MIN = HOUR_PX / 60;
const MIN_BLOCK_PX = 54;       // 短会话的最小可读高度

// 本地日历键 "YYYY-MM-DD"（避开 UTC 偏移）
function dayKey(d) {
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
function groupRecordsByDay(records) {
  const map = new Map();
  for (const r of records) {
    const key = dayKey(new Date(r.startedAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return map;
}

// 构建覆盖整月的 6×7 网格，从包含 1 号的那一周的周一开始
function buildMonthGrid(year, month, dayMap, todayKey) {
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
function buildDayView(records, isToday) {
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

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export default function CalendarPage() {
  const { focusRecords } = useFocus();

  // 不缓存 today：页面可能整天开着，跨午夜需自然刷新到真实今天。
  const today = new Date();
  const todayKey = dayKey(today);

  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const dayMap = useMemo(() => groupRecordsByDay(focusRecords), [focusRecords]);

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, dayMap, todayKey),
    [cursor, dayMap, todayKey],
  );

  const monthSummary = useMemo(() => {
    const inMonth = cells.filter((c) => c.inMonth);
    return {
      totalSecs: inMonth.reduce((s, c) => s + c.secs, 0),
      activeDays: inMonth.filter((c) => c.secs > 0).length,
      sessionCount: inMonth.reduce((s, c) => s + c.sessionCount, 0),
    };
  }, [cells]);

  const selectedDay = useMemo(() => {
    const recs = dayMap.get(selectedKey) ?? [];
    const [sy, sm, sd] = selectedKey.split("-").map(Number);
    return {
      date: new Date(sy, sm - 1, sd),
      totalSecs: totalFocusSecs(recs),
      view: buildDayView(recs, selectedKey === todayKey),
    };
  }, [dayMap, selectedKey, todayKey]);

  const stepMonth = (delta) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedKey(todayKey);
  };

  const selectedLabel = selectedDay.date.toLocaleDateString("zh-CN", {
    month: "long", day: "numeric", weekday: "long",
  });
  const isTodaySelected = selectedKey === todayKey;
  const { view } = selectedDay;

  return (
    <div className="page-calendar">
      {/* ── 页头 ── */}
      <div className="cal-headline">
        <h1>时间轴</h1>
        <p>回看每一天的专注足迹，点开某天看当日的时刻轨道</p>
      </div>

      {/* ── 月度汇总 ── */}
      <div className="cal-summary">
        <div className="cal-summary-card accent">
          <Clock3 className="cal-summary-icon" size={18} aria-hidden="true" />
          <div className="cal-summary-value">{formatDuration(monthSummary.totalSecs)}</div>
          <div className="cal-summary-label">本月专注时长</div>
        </div>
        <div className="cal-summary-card">
          <Flame className="cal-summary-icon" size={18} aria-hidden="true" />
          <div className="cal-summary-value">{monthSummary.sessionCount}</div>
          <div className="cal-summary-label">专注次数</div>
        </div>
        <div className="cal-summary-card">
          <CalendarCheck className="cal-summary-icon" size={18} aria-hidden="true" />
          <div className="cal-summary-value">{monthSummary.activeDays}</div>
          <div className="cal-summary-label">活跃天数</div>
        </div>
      </div>

      <div className="cal-layout">
        {/* ── 月历卡片 ── */}
        <section className="cal-card">
          <div className="cal-nav">
            <button type="button" className="cal-nav-btn" onClick={() => stepMonth(-1)} aria-label="上个月">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div className="cal-nav-title">
              <span className="cal-nav-year">{cursor.year}</span>
              <span className="cal-nav-month">{MONTH_NAMES[cursor.month]}</span>
            </div>
            <button type="button" className="cal-nav-btn" onClick={() => stepMonth(1)} aria-label="下个月">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="cal-today-btn" onClick={goToday}>
              <CalendarDays size={14} aria-hidden="true" />
              今天
            </button>
          </div>

          <div className="cal-weekdays">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={`cal-weekday${i >= 5 ? " weekend" : ""}`}>{w}</span>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map((cell) => {
              const cls = [
                "cal-cell",
                cell.inMonth ? "" : "out",
                cell.isToday ? "today" : "",
                cell.key === selectedKey ? "selected" : "",
                cell.isWeekend ? "weekend" : "",
              ].filter(Boolean).join(" ");
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={cls}
                  data-level={cell.level}
                  onClick={() => setSelectedKey(cell.key)}
                  title={cell.secs > 0 ? formatDuration(cell.secs) : ""}
                >
                  <span className="cal-cell-day">{cell.date.getDate()}</span>
                  {cell.secs > 0 && (
                    <span className="cal-cell-bar" style={{ opacity: 0.35 + cell.level * 0.16 }} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="cal-legend">
            <span className="cal-legend-label">少</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className="cal-legend-cell" data-level={l} />
            ))}
            <span className="cal-legend-label">多</span>
          </div>
        </section>

        {/* ── 当日时刻轨道 ── */}
        <section className="cal-day">
          <div className="cal-day-hd">
            <span className="cal-day-title">{selectedLabel}</span>
            {isTodaySelected && <span className="cal-day-today">今天</span>}
            {selectedDay.totalSecs > 0 && (
              <span className="cal-day-badge">共 {formatDuration(selectedDay.totalSecs)}</span>
            )}
          </div>

          {view.sessions.length === 0 ? (
            <div className="cal-day-empty">
              <Clock3 size={26} aria-hidden="true" />
              <span>这一天还没有专注记录</span>
            </div>
          ) : (
            <div className="cal-track" style={{ height: view.height }}>
              {/* 小时刻度 */}
              {view.hours.map((h, i) => (
                <div
                  key={h}
                  className="cal-track-hour"
                  style={{ top: (h - view.startHour) * HOUR_PX }}
                >
                  <span className="cal-track-hlabel">
                    {i === view.hours.length - 1 ? "" : `${String(h).padStart(2, "0")}:00`}
                  </span>
                  <span className="cal-track-hline" />
                </div>
              ))}

              {/* 当前时刻线 */}
              {view.nowTop != null && (
                <div className="cal-track-now" style={{ top: view.nowTop }}>
                  <span className="cal-track-now-dot" />
                </div>
              )}

              {/* 会话块 */}
              {view.sessions.map((s) => {
                const compact = s.height < 78;
                return (
                  <div
                    key={s.key}
                    className={`cal-block tone-${s.tone}${compact ? " compact" : ""}`}
                    style={{
                      top: s.top,
                      height: s.height,
                      "--lane": s.lane,
                      "--lanes": s.lanes,
                    }}
                  >
                    <div className="cal-block-head">
                      <span className="cal-block-time">{formatTime(s.startMs)}</span>
                      <span className="cal-block-dur">{formatDuration(s.totalSecs)}</span>
                      {s.scenarioTitle && !compact && (
                        <span className="cal-block-scenario">{s.scenarioTitle}</span>
                      )}
                    </div>

                    <div className="cal-block-tasks">
                      {s.tasks.slice(0, compact ? 1 : 3).map((task, i) => {
                        const meta = OUTCOME_META[task.outcome] ?? { label: task.outcome, cls: "ended" };
                        return (
                          <div key={i} className="cal-block-task">
                            <span className="cal-block-task-name">{task.text}</span>
                            {!compact && (
                              <span className={`cal-block-outcome ${meta.cls}`}>{meta.label}</span>
                            )}
                          </div>
                        );
                      })}
                      {compact && s.tasks.length > 1 && (
                        <span className="cal-block-more">+{s.tasks.length - 1}</span>
                      )}
                    </div>

                    {!compact && (s.coins > 0 || s.distractions > 0) && (
                      <div className="cal-block-foot">
                        {s.coins > 0 && (
                          <span className="cal-block-chip">
                            <Coins size={12} aria-hidden="true" />+{s.coins}
                          </span>
                        )}
                        {s.distractions > 0 && (
                          <span className="cal-block-chip warn">
                            <Zap size={12} aria-hidden="true" />分心 {s.distractions}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
