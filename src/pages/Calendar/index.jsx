import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CalendarDays,
  Clock3, Flame, CalendarCheck,
} from "lucide-react";
import { useFocus } from "@/context/FocusContext";
import { useActivityLog } from "@/context/ActivityContext";
import { useLanguage } from "@/context/LanguageContext";
import { totalFocusSecs } from "@/utils/records/focusRecords";
import { formatDuration } from "@/utils/time";
import DayLog from "@/components/records/DayLog";
import RecordList from "@/components/records/RecordList";
import "@/components/records/records.css";
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

// 星期与月份只存下标，文案走 i18n（calendar.weekday.<i> / calendar.month.<i>）。
const WEEKDAY_IDX = [0, 1, 2, 3, 4, 5, 6];

// 时间轴 = 原「时间轴」+「历史记录」两页合一：
// 上半是日历（按天挑），下半在「日历 / 全部记录」两个视图间切。
// 汇总数字与图表仍然只归 /analytics，这里不重复摆。
export default function CalendarPage() {
  const { focusRecords, clearFocusRecords } = useFocus();
  const { activities } = useActivityLog();
  const { t, lang } = useLanguage();

  // "calendar"=挑一天看；"all"=一条条原始流水按天铺开
  const [view, setView] = useState("calendar");

  // 清除记录是二次确认：先变成「确认清除？」，3 秒不点就复原
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(confirmTimerRef.current), []);

  const handleClear = () => {
    if (confirmClear) {
      clearFocusRecords();
      setConfirmClear(false);
      return;
    }
    setConfirmClear(true);
    confirmTimerRef.current = setTimeout(() => setConfirmClear(false), 3000);
  };

  // 不缓存 today：页面可能整天开着，跨午夜需自然刷新到真实今天。
  const today = new Date();
  const todayKey = dayKey(today);

  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  // 默认铺开整月，点「收起」才只留一行本周
  const [expanded, setExpanded] = useState(true);
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

  const selectedLabel = selectedDay.date.toLocaleDateString(lang === "en" ? "en-GB" : "zh-CN", {
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
        <h1>{t("calendar.title")}</h1>
        <p>{t("calendar.subtitle")}</p>
      </div>

      {/* 视图切换：同一份流水的两种看法——挑一天 / 全部铺开 */}
      <div className="cal-view-switch" role="group" aria-label={t("history.viewSwitchAria")}>
        {[
          { id: "calendar", label: t("history.viewCalendar") },
          { id: "all", label: t("history.allRecords") },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            className={`cal-view-btn${view === v.id ? " active" : ""}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "all" ? (
        <RecordList
          records={focusRecords}
          activities={activities}
          confirmClear={confirmClear}
          onClear={handleClear}
        />
      ) : (
        <>
          {/* ── 月度汇总 ── */}
          <div className="cal-summary">
            <div className="cal-summary-card accent">
              <Clock3 className="cal-summary-icon" size={18} aria-hidden="true" />
              <div className="cal-summary-value">{formatDuration(monthSummary.totalSecs)}</div>
              <div className="cal-summary-label">{t("calendar.monthTotal")}</div>
            </div>
            <div className="cal-summary-card">
              <Flame className="cal-summary-icon" size={18} aria-hidden="true" />
              <div className="cal-summary-value">{monthSummary.sessionCount}</div>
              <div className="cal-summary-label">{t("calendar.sessionCount")}</div>
            </div>
            <div className="cal-summary-card">
              <CalendarCheck className="cal-summary-icon" size={18} aria-hidden="true" />
              <div className="cal-summary-value">{monthSummary.activeDays}</div>
              <div className="cal-summary-label">{t("calendar.activeDays")}</div>
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
                  aria-label={expanded ? t("calendar.prevMonth") : t("calendar.prevWeek")}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <div className="cal-nav-title">
                  <span className="cal-nav-year">{cursor.year}</span>
                  <span className="cal-nav-month">{t(`calendar.month.${cursor.month}`)}</span>
                  {!expanded && <span className="cal-nav-week">{weekLabel}</span>}
                </div>
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => step(1)}
                  aria-label={expanded ? t("calendar.nextMonth") : t("calendar.nextWeek")}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
                <button type="button" className="cal-today-btn" onClick={goToday}>
                  <CalendarDays size={14} aria-hidden="true" />
                  {t("common.today")}
                </button>
                <button
                  type="button"
                  className="cal-expand-btn"
                  onClick={toggleExpanded}
                  aria-expanded={expanded}
                >
                  {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                  {expanded ? t("calendar.collapse") : t("calendar.wholeMonth")}
                </button>
              </div>

              <div className="cal-weekdays">
                {WEEKDAY_IDX.map((i) => (
                  <span key={i} className={`cal-weekday${i >= 5 ? " weekend" : ""}`}>
                    {t(`calendar.weekday.${i}`)}
                  </span>
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
                        cell.actCount > 0 ? t("calendar.actCount", { count: cell.actCount }) : "",
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
                  <span className="cal-legend-label">{t("calendar.legendLow")}</span>
                  {[0, 1, 2, 3, 4].map((l) => (
                    <span key={l} className="cal-legend-cell" data-level={l} />
                  ))}
                  <span className="cal-legend-label">{t("calendar.legendHigh")}</span>
                </div>
              ) : (
                <button type="button" className="cal-expand-bar" onClick={toggleExpanded}>
                  <ChevronDown size={14} aria-hidden="true" />
                  {t("calendar.expandMonth")}
                </button>
              )}
            </section>

            {/* ── 当日时刻轨道 ── */}
            <section className="cal-day">
              <div className="cal-day-hd">
                <span className="cal-day-title">{selectedLabel}</span>
                {isTodaySelected && <span className="cal-day-today">{t("common.today")}</span>}
                {selectedDay.totalSecs > 0 && (
                  <span className="cal-day-badge">
                    {t("calendar.dayTotal", { duration: formatDuration(selectedDay.totalSecs) })}
                  </span>
                )}
              </div>

              {/* 当日流水：会话卡与使用记录混排，与「全部记录」视图共用同一套渲染 */}
              <DayLog records={selectedDay.records} activities={selectedDay.activities} />
            </section>
            </div>
        </>
      )}
    </div>
  );
}
