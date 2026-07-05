import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Coins, Zap, CalendarDays } from "lucide-react";
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
    cells.push({
      date,
      key,
      inMonth: date.getMonth() === month,
      isToday: key === todayKey,
      secs,
      level: heatLevel(secs),
      sessionCount: new Set(recs.map((r) => r.sessionId ?? r.id)).size,
    });
  }
  return cells;
}

// 把某天的记录整理成时间轴用的会话卡片数据
function buildDayTimeline(records) {
  const sessions = groupBySession(records);
  return sessions
    .map((s) => {
      const taskMap = new Map();
      let coins = 0;
      let distractions = 0;
      let scenarioTitle;
      for (const r of s.records) {
        if (!taskMap.has(r.taskText)) {
          taskMap.set(r.taskText, r.outcome);
        }
        coins += r.coinsEarned ?? 0;
        distractions += r.distractionCount ?? 0;
        if (!scenarioTitle && r.scenarioTitle) scenarioTitle = r.scenarioTitle;
      }
      return {
        key: s.key,
        startedAt: s.startedAt,
        totalSecs: s.totalSecs,
        tasks: [...taskMap.entries()].map(([text, outcome]) => ({ text, outcome })),
        coins,
        distractions,
        scenarioTitle,
      };
    })
    .sort((a, b) => a.startedAt - b.startedAt);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function CalendarPage() {
  const { focusRecords } = useFocus();

  // 不缓存 today：页面可能整天开着不关，跨午夜后需自然刷新到真实今天，
  // 否则「回到今天」和今日高亮会停在昨天。new Date() 开销可忽略，
  // todayKey 是字符串主键，下游 useMemo（cells 等）仍按值稳定。
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

  // 月度汇总（只算本月内的日子）
  const monthSummary = useMemo(() => {
    const inMonth = cells.filter((c) => c.inMonth);
    const totalSecs = inMonth.reduce((sum, c) => sum + c.secs, 0);
    const activeDays = inMonth.filter((c) => c.secs > 0).length;
    const sessionCount = inMonth.reduce((sum, c) => sum + c.sessionCount, 0);
    return { totalSecs, activeDays, sessionCount };
  }, [cells]);

  const selectedDay = useMemo(() => {
    const recs = dayMap.get(selectedKey) ?? [];
    const [sy, sm, sd] = selectedKey.split("-").map(Number);
    return {
      date: new Date(sy, sm - 1, sd),
      sessions: buildDayTimeline(recs),
      totalSecs: totalFocusSecs(recs),
    };
  }, [dayMap, selectedKey]);

  const stepMonth = (delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedKey(todayKey);
  };

  const selectedLabel = selectedDay.date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="page-calendar">
      {/* ── 页头 ─────────────────────────────────────────────── */}
      <div className="cal-headline">
        <h1>时间轴</h1>
        <p>回看每一天的专注足迹，点开某天看当日的专注时间轴</p>
      </div>

      {/* ── 月度汇总 ─────────────────────────────────────────── */}
      <div className="cal-summary">
        <div className="cal-summary-card accent">
          <div className="cal-summary-value">{formatDuration(monthSummary.totalSecs)}</div>
          <div className="cal-summary-label">本月专注时长</div>
        </div>
        <div className="cal-summary-card">
          <div className="cal-summary-value">{monthSummary.sessionCount}</div>
          <div className="cal-summary-label">专注次数</div>
        </div>
        <div className="cal-summary-card">
          <div className="cal-summary-value">{monthSummary.activeDays}</div>
          <div className="cal-summary-label">活跃天数</div>
        </div>
      </div>

      {/* ── 日历卡片 ─────────────────────────────────────────── */}
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
            回到今天
          </button>
        </div>

        <div className="cal-weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w} className="cal-weekday">{w}</span>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((cell) => {
            const cls = [
              "cal-cell",
              cell.inMonth ? "" : "out",
              cell.isToday ? "today" : "",
              cell.key === selectedKey ? "selected" : "",
              cell.secs > 0 ? "has-focus" : "",
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
                  <span className="cal-cell-dur">{formatDuration(cell.secs)}</span>
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

      {/* ── 当日时间轴 ───────────────────────────────────────── */}
      <section className="cal-day">
        <div className="cal-day-hd">
          <span className="cal-day-title">{selectedLabel}</span>
          {selectedDay.totalSecs > 0 && (
            <span className="cal-day-badge">
              共专注 {formatDuration(selectedDay.totalSecs)}
            </span>
          )}
        </div>

        {selectedDay.sessions.length === 0 ? (
          <div className="cal-day-empty">这一天还没有专注记录</div>
        ) : (
          <ol className="cal-timeline">
            {selectedDay.sessions.map((s) => (
              <li key={s.key} className="cal-tl-item">
                <div className="cal-tl-node" />
                <div className="cal-tl-body">
                  <div className="cal-tl-top">
                    <span className="cal-tl-time">{formatTime(s.startedAt)}</span>
                    <span className="cal-tl-dur">{formatDuration(s.totalSecs)}</span>
                    {s.scenarioTitle && (
                      <span className="cal-tl-scenario">{s.scenarioTitle}</span>
                    )}
                  </div>

                  <div className="cal-tl-tasks">
                    {s.tasks.map((task, i) => {
                      const meta = OUTCOME_META[task.outcome] ?? { label: task.outcome, cls: "ended" };
                      return (
                        <div key={i} className="cal-tl-task">
                          <span className="cal-tl-task-name">{task.text}</span>
                          <span className={`cal-tl-outcome ${meta.cls}`}>{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {(s.coins > 0 || s.distractions > 0) && (
                    <div className="cal-tl-foot">
                      {s.coins > 0 && (
                        <span className="cal-tl-chip">
                          <Coins size={13} aria-hidden="true" />
                          +{s.coins}
                        </span>
                      )}
                      {s.distractions > 0 && (
                        <span className="cal-tl-chip warn">
                          <Zap size={13} aria-hidden="true" />
                          分心 {s.distractions} 次
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
