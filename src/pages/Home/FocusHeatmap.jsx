import React, { useMemo, useRef, useLayoutEffect } from "react";
import { totalFocusSecs } from "@/utils/records/focusRecords";
import { formatDuration } from "@/utils/time";
import { useLanguage } from "@/context/LanguageContext";
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
  const { t, lang } = useLanguage();
  const scrollRef = useRef(null);
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

  // 371 个格子的 level / tooltip 全部预先算好：日期格式化和 t() 拼串都不便宜，
  // 留在 render 里就是每次重渲染跑 371 次（父组件一动、语言一切都会触发）。
  // 这里只在数据或语言真的变了时算一次，渲染阶段就只剩铺 div。
  const cells = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
      month: "long",
      day: "numeric",
    });
    const out = [];
    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi];
      for (let di = 0; di < week.length; di++) {
        const cell = week[di];
        if (cell.isFuture) {
          out.push({ key: `${wi}-${di}`, level: "future", title: "" });
          continue;
        }
        const date = fmt.format(cell.date);
        out.push({
          key: `${wi}-${di}`,
          level: getLevel(cell.secs),
          title:
            cell.secs > 0
              ? t("heatmap.cellFocus", { date, duration: formatDuration(cell.secs) })
              : t("heatmap.cellEmpty", { date }),
        });
      }
    }
    return out;
  }, [weeks, lang, t]);

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

  // 窄屏下热力图横向滚动，进场时把视口对齐到最右（本周），
  // 这样最近的活跃度立刻可见，无需用户手动滑到头。
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  const totalHours = Math.floor(totalSecs / 3600);
  const totalMins = Math.round((totalSecs % 3600) / 60);
  const totalLabel =
    totalSecs > 0
      ? t("heatmap.total", {
          hours: totalHours > 0 ? totalHours + "h " : "",
          mins: totalMins,
        })
      : t("heatmap.empty");

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-header">
        <span className="heatmap-title">{t("heatmap.title")}</span>
        <span className="heatmap-total">{totalLabel}</span>
      </div>

      <div className="heatmap-body">
        {/* Left day-of-week labels (fixed column, never scrolls) */}
        <div className="heatmap-day-labels">
          {DAY_ROW_LABELS.map((label, i) => (
            <span key={i} className="heatmap-day-label">
              {label ?? ""}
            </span>
          ))}
        </div>

        {/* Scrollable column: month labels + grid scroll together on narrow screens */}
        <div className="heatmap-scroll" ref={scrollRef}>
          {/* Month labels row */}
          <div className="heatmap-month-row">
            {monthLabels.map((label, i) => (
              <span key={i} className="heatmap-month-label">
                {label ?? ""}
              </span>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="heatmap-grid">
            {cells.map((cell) => (
              <div
                key={cell.key}
                className="heatmap-cell"
                data-level={cell.level}
                title={cell.title}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-footer">
        <span className="heatmap-legend-label">{t("heatmap.less")}</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className="heatmap-legend-cell" data-level={l} />
        ))}
        <span className="heatmap-legend-label">{t("heatmap.more")}</span>
      </div>
    </div>
  );
}
