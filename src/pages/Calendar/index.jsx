import React, { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, Coins, Zap,
  Clock3, Flame, CalendarCheck,
} from "lucide-react";
import { useFocus } from "@/context/FocusContext";
import { totalFocusSecs, OUTCOME_META } from "@/utils/records/focusRecords";
import { formatDuration } from "@/utils/time";
import {
  HOUR_PX,
  dayKey,
  groupRecordsByDay,
  buildMonthGrid,
  buildDayView,
  formatTime,
} from "./calendarLayout";
import "./Calendar.css";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_NAMES = [
  "1 月", "2 月", "3 月", "4 月", "5 月", "6 月",
  "7 月", "8 月", "9 月", "10 月", "11 月", "12 月",
];

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
