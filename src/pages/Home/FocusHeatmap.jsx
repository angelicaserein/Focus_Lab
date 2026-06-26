import React, { useMemo } from "react";
import { totalFocusSecs } from "../../utils/focusRecords";
import { formatDuration } from "../../utils/time";
import "./FocusHeatmap.css";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_ROW_LABELS = ["Mon", null, "Wed", null, "Fri", null, null];

function getLevel(secs) {
  if (secs === 0) return 0;
  if (secs < 25 * 60) return 1;
  if (secs < 60 * 60) return 2;
  if (secs < 120 * 60) return 3;
  return 4;
}

// 按本地日历日期 "YYYY-MM-DD" 把记录分组
function groupRecordsByDay(records) {
  const map = new Map();
  for (const r of records) {
    const d = new Date(r.startedAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return map;
}

// 构建 53 周 × 7 天网格，最右一列为本周；返回 { weeks, startDate }
function buildWeekGrid(dayRecordsMap, today) {
  // 本周一（Mon=0, Sun=6）
  const dow = (today.getDay() + 6) % 7;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - dow);

  // 网格从本周一往前 52 周开始（共 53 列）
  const startDate = new Date(thisMonday);
  startDate.setDate(thisMonday.getDate() - 52 * 7);

  const weeks = [];
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + dayOfWeek);
      const isFuture = date > today;
      const key = date.toISOString().slice(0, 10);
      const dayRecs = dayRecordsMap.get(key) ?? [];
      const secs = isFuture ? 0 : totalFocusSecs(dayRecs);
      week.push({ date, secs, isFuture });
    }
    weeks.push(week);
  }

  return { weeks, startDate };
}

export default function FocusHeatmap({ records }) {
  const { weeks, totalSecs } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayRecordsMap = groupRecordsByDay(records);
    const { weeks, startDate } = buildWeekGrid(dayRecordsMap, today);

    const totalSecs = totalFocusSecs(
      records.filter((r) => r.startedAt >= startDate.getTime()),
    );

    return { weeks, totalSecs };
  }, [records]);

  // Month label: show name at the first column where the month changes
  const monthLabels = useMemo(
    () =>
      weeks.map((week, i) => {
        const m = week[0].date.getMonth();
        if (i === 0) return MONTH_NAMES[m];
        return weeks[i - 1][0].date.getMonth() !== m ? MONTH_NAMES[m] : null;
      }),
    [weeks],
  );

  const totalHours = Math.floor(totalSecs / 3600);
  const totalMins = Math.round((totalSecs % 3600) / 60);
  const totalLabel =
    totalSecs > 0
      ? `过去一年共专注 ${totalHours > 0 ? totalHours + "h " : ""}${totalMins}m`
      : "快去记录你的第一次专注吧！";

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-header">
        <span className="heatmap-title">专注热力图</span>
        <span className="heatmap-total">{totalLabel}</span>
      </div>

      <div className="heatmap-body">
        {/* corner spacer */}
        <div />

        {/* Month labels row */}
        <div className="heatmap-month-row">
          {monthLabels.map((label, i) => (
            <span key={i} className="heatmap-month-label">
              {label ?? ""}
            </span>
          ))}
        </div>

        {/* Left day-of-week labels */}
        <div className="heatmap-day-labels">
          {DAY_ROW_LABELS.map((label, i) => (
            <span key={i} className="heatmap-day-label">
              {label ?? ""}
            </span>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="heatmap-grid">
          {weeks.map((week, wi) =>
            week.map((cell, di) => {
              const level = cell.isFuture ? "future" : getLevel(cell.secs);
              const dateStr = cell.date.toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
              });
              const title = cell.isFuture
                ? ""
                : cell.secs > 0
                  ? `${dateStr} · 专注 ${formatDuration(cell.secs)}`
                  : `${dateStr} · 无记录`;
              return (
                <div
                  key={`${wi}-${di}`}
                  className="heatmap-cell"
                  data-level={level}
                  title={title}
                />
              );
            }),
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-footer">
        <span className="heatmap-legend-label">少</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className="heatmap-legend-cell" data-level={l} />
        ))}
        <span className="heatmap-legend-label">多</span>
      </div>
    </div>
  );
}
