import React, { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { WEEKS, LANES, TOTAL_WEEKS, laneRowCount } from "./ganttData";
import "./Gantt.css";

// 把三条泳道摊平成带「绝对网格行号」的渲染指令：
//   grid 第 1 行是周表头；之后每条泳道占 rowCount 行，依次往下排。
// 这样一整张甘特图就是一个 CSS grid，表头列和任务列天然对齐。
function useGanttLayout() {
  return useMemo(() => {
    const lanes = [];
    let cursor = 2; // 第 1 行留给周表头
    for (const lane of LANES) {
      const rows = laneRowCount(lane);
      lanes.push({ ...lane, startRow: cursor, rows });
      cursor += rows;
    }
    const totalRows = cursor - 1; // 含表头的总行数
    return { lanes, totalRows };
  }, []);
}

export default function GanttPage() {
  const { t } = useLanguage();
  const { lanes, totalRows } = useGanttLayout();

  const taskCount = useMemo(
    () => LANES.reduce((sum, l) => sum + l.tasks.length, 0),
    [],
  );

  return (
    <div className="page-gantt">
      {/* ── 页头 ── */}
      <div className="gantt-headline">
        <h1>{t("gantt.title")}</h1>
        <p>{t("gantt.subtitle")}</p>
      </div>

      {/* ── 概览卡 ── */}
      <div className="gantt-summary">
        <div className="gantt-summary-card accent">
          <div className="gantt-summary-value">{TOTAL_WEEKS}</div>
          <div className="gantt-summary-label">{t("gantt.stat.weeks")}</div>
        </div>
        <div className="gantt-summary-card">
          <div className="gantt-summary-value">{taskCount}</div>
          <div className="gantt-summary-label">{t("gantt.stat.tasks")}</div>
        </div>
        <div className="gantt-summary-card">
          <div className="gantt-summary-value">{LANES.length}</div>
          <div className="gantt-summary-label">{t("gantt.stat.tracks")}</div>
        </div>
      </div>

      {/* ── 甘特图卡片 ── */}
      <section className="gantt-card">
        <div className="gantt-scroll">
          <div
            className="gantt-grid"
            style={{
              "--weeks": TOTAL_WEEKS,
              gridTemplateRows: `auto repeat(${totalRows - 1}, minmax(46px, auto))`,
            }}
          >
            {/* 泳道底色带（铺在最底层） */}
            {lanes.map((lane) => (
              <div
                key={`band-${lane.id}`}
                className={`gantt-band lane-${lane.id}`}
                style={{ gridRow: `${lane.startRow} / span ${lane.rows}` }}
              />
            ))}

            {/* 竖向周分隔线（覆盖所有泳道行） */}
            {WEEKS.map((_, i) => (
              <div
                key={`guide-${i}`}
                className="gantt-guide"
                style={{
                  gridColumn: i + 2,
                  gridRow: `2 / span ${totalRows - 1}`,
                }}
              />
            ))}

            {/* 左上角：Timeline 表头 */}
            <div className="gantt-corner">{t("gantt.timeline")}</div>

            {/* 周表头 */}
            {WEEKS.map((w, i) => (
              <div key={w.label} className="gantt-weekhead" style={{ gridColumn: i + 2 }}>
                <span className="gantt-week-label">{w.label}</span>
                <span className="gantt-week-range">{w.range}</span>
              </div>
            ))}

            {/* 泳道左侧标签 */}
            {lanes.map((lane) => (
              <div
                key={`label-${lane.id}`}
                className={`gantt-lane-label lane-${lane.id}`}
                style={{ gridRow: `${lane.startRow} / span ${lane.rows}` }}
              >
                <span>{lane.label}</span>
              </div>
            ))}

            {/* 任务条 */}
            {lanes.map((lane) =>
              lane.tasks.map((task, i) => (
                <div
                  key={`${lane.id}-${i}`}
                  className={`gantt-bar lane-${lane.id}`}
                  style={{
                    gridColumn: `${task.start + 1} / ${task.end + 2}`,
                    gridRow: lane.startRow + task.row,
                  }}
                  title={`${task.title} · ${WEEKS[task.start - 1].label}–${WEEKS[task.end - 1].label}`}
                >
                  <span className="gantt-bar-title">{task.title}</span>
                  <span className="gantt-bar-tag">{task.tag}</span>
                </div>
              )),
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
