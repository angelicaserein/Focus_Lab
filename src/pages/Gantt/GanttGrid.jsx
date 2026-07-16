import React from "react";
import { useLanguage } from "@/context/LanguageContext";

// 甘特网格的纯展示层：底色带 / 列分隔线 / 表头 / 泳道标签 / 任务条，全部由 CSS Grid 定位。
// 输入全来自 props（列与泳道布局已由 ganttDate 算好），自身无状态，从页面组件里拆出来专注渲染。
export default function GanttGrid({ columns, lanes, totalRows, editing, onBarClick }) {
  const { t } = useLanguage();

  if (columns.length === 0) {
    return (
      <div className="gantt-empty inner">
        <p>{t("gantt.empty.badRange")}</p>
      </div>
    );
  }

  return (
    <div className="gantt-scroll">
      <div
        className={`gantt-grid${editing ? " is-editing" : ""}`}
        style={{
          "--cols": columns.length,
          gridTemplateRows: `auto repeat(${totalRows - 1}, minmax(46px, auto))`,
        }}
      >
        {/* 泳道底色带 */}
        {lanes.map((lane, i) => (
          <div
            key={`band-${lane.id}`}
            className={`gantt-band lane-${i % 4}`}
            style={{ gridRow: `${lane.startRow} / span ${lane.rows}` }}
          />
        ))}

        {/* 竖向列分隔线 */}
        {columns.map((col) => (
          <div
            key={`guide-${col.index}`}
            className="gantt-guide"
            style={{ gridColumn: col.index + 2, gridRow: `2 / span ${totalRows - 1}` }}
          />
        ))}

        {/* 左上角表头 */}
        <div className="gantt-corner">{t("gantt.timeline")}</div>

        {/* 列表头 */}
        {columns.map((col) => (
          <div key={`head-${col.index}`} className="gantt-weekhead" style={{ gridColumn: col.index + 2 }}>
            <span className="gantt-week-label">{col.primary}</span>
            <span className="gantt-week-range">{col.secondary}</span>
          </div>
        ))}

        {/* 泳道左侧标签 */}
        {lanes.map((lane, i) => (
          <div
            key={`label-${lane.id}`}
            className={`gantt-lane-label lane-${i % 4}`}
            style={{ gridRow: `${lane.startRow} / span ${lane.rows}` }}
          >
            <span>{lane.label}</span>
          </div>
        ))}

        {/* 任务条 */}
        {lanes.map((lane, i) =>
          lane.tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className={`gantt-bar lane-${i % 4}`}
              disabled={!editing}
              style={{
                gridColumn: `${task.startCol + 2} / ${task.endCol + 3}`,
                gridRow: lane.startRow + task.row,
              }}
              onClick={() => onBarClick(task)}
              title={`${task.title} · ${task.start}–${task.end}`}
            >
              <span className="gantt-bar-title">{task.title}</span>
              {task.tag && <span className="gantt-bar-tag">{task.tag}</span>}
            </button>
          )),
        )}
      </div>
    </div>
  );
}
