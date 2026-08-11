import React, { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CalendarDays,
  Clock3, Flame, CalendarCheck,
} from "lucide-react";
import { useFocus } from "@/context/FocusContext";
import { useActivityLog } from "@/context/ActivityContext";
import { totalFocusSecs } from "@/utils/records/focusRecords";
import { formatDuration } from "@/utils/time";
import DayLog from "@/components/records/DayLog";
import {
  dayKey,
  groupRecordsByDay,
  groupActivitiesByDay,
  buildMonthGrid,
  buildWeekRow,
  formatCellDuration,
  startOfWeek,
} from "./calendarLayout";
import "./Calendar.css";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_NAMES = [
  "1 月", "2 月", "3 月", "4 月", "5 月", "6 月",
  "7 月", "8 月", "9 月", "10 月", "11 月", "12 月",
];

export default function CalendarPage() {
  const { focusRecords } = useFocus();
  const { activities } = useActivityLog();

  // 不缓存 today：页面可能整天开着，跨午夜需自然刷新到真实今天。
  const today = new Date();
  const todayKey = dayKey(today);

  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  // 平时只留一行本周，点「展开」才铺开整月
  const [expanded, setExpanded] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const dayMap = useMemo(() => groupRecordsByDay(focusRecords), [focusRecords]);
  const actMap = useMemo(() => groupActivitiesByDay(activities), [activities]);

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, dayMap, todayKey, actMap),
    [cursor, dayMap, todayKey, actMap],
  );

  const weekCells = useMemo(
    () => buildWeekRow(weekStart, dayMap, todayKey, actMap),
    [weekStart, dayMap, todayKey, actMap],
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
    const acts = actMap.get(selectedKey) ?? [];
    const [sy, sm, sd] = selectedKey.split("-").map(Number);
    return {
      date: new Date(sy, sm - 1, sd),
      totalSecs: totalFocusSecs(recs),
      records: recs,
      activities: acts,
    };
  }, [dayMap, actMap, selectedKey]);

  const stepMonth = (delta) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  // 收起态翻的是"周"；月度汇总跟着这周所属的月份走（以周四归属，跨月周不来回跳）
  const stepWeek = (delta) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + delta * 7);
    setWeekStart(d);
    const owner = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3);
    setCursor({ year: owner.getFullYear(), month: owner.getMonth() });
  };

  const step = (delta) => (expanded ? stepMonth(delta) : stepWeek(delta));

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setWeekStart(startOfWeek(today));
    setSelectedKey(todayKey);
  };

  // 展开/收起：收起时把这一行落在当前选中的那天上，别跳回别处
  const toggleExpanded = () => {
    if (expanded) {
      const [sy, sm, sd] = selectedKey.split("-").map(Number);
      setWeekStart(startOfWeek(new Date(sy, sm - 1, sd)));
    }
    setExpanded((v) => !v);
  };

  const selectedLabel = selectedDay.date.toLocaleDateString("zh-CN", {
    month: "long", day: "numeric", weekday: "long",
  });
  const isTodaySelected = selectedKey === todayKey;
  const weekLabel = (() => {
    const end = weekCells[6].date;
    return `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`;
  })();

  return (
    <div className="page-calendar">
      {/* ── 页头 ── */}
      <div className="cal-headline">
        <h1>时间轴</h1>
        <p>平时只看本周，点「展开整月」铺开月历；每格是当天的专注时长</p>
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
        <section className={`cal-card${expanded ? " expanded" : ""}`}>
          <div className="cal-nav">
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => step(-1)}
              aria-label={expanded ? "上个月" : "上一周"}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div className="cal-nav-title">
              <span className="cal-nav-year">{cursor.year}</span>
              <span className="cal-nav-month">{MONTH_NAMES[cursor.month]}</span>
              {!expanded && <span className="cal-nav-week">{weekLabel}</span>}
            </div>
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => step(1)}
              aria-label={expanded ? "下个月" : "下一周"}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="cal-today-btn" onClick={goToday}>
              <CalendarDays size={14} aria-hidden="true" />
              今天
            </button>
            <button
              type="button"
              className="cal-expand-btn"
              onClick={toggleExpanded}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
              {expanded ? "收起" : "整月"}
            </button>
          </div>

          <div className="cal-weekdays">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={`cal-weekday${i >= 5 ? " weekend" : ""}`}>{w}</span>
            ))}
          </div>

          <div className={`cal-grid${expanded ? "" : " week"}`}>
            {(expanded ? cells : weekCells).map((cell) => {
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
                  title={[
                    cell.secs > 0 ? formatDuration(cell.secs) : "",
                    cell.actCount > 0 ? `${cell.actCount} 条使用记录` : "",
                  ].filter(Boolean).join(" · ")}
                >
                  <span className="cal-cell-day">{cell.date.getDate()}</span>
                  {cell.actCount > 0 && <span className="cal-cell-act" />}
                  <span className="cal-cell-secs">{formatCellDuration(cell.secs)}</span>
                </button>
              );
            })}
          </div>

          {expanded ? (
            <div className="cal-legend">
              <span className="cal-legend-label">少</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className="cal-legend-cell" data-level={l} />
              ))}
              <span className="cal-legend-label">多</span>
            </div>
          ) : (
            <button type="button" className="cal-expand-bar" onClick={toggleExpanded}>
              <ChevronDown size={14} aria-hidden="true" />
              展开整月
            </button>
          )}
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

          {/* 当日流水：会话卡与使用记录混排，与 /history 共用同一套渲染 */}
          <DayLog records={selectedDay.records} activities={selectedDay.activities} />
        </section>
      </div>
    </div>
  );
}
