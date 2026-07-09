import React, { useMemo, useState } from "react";
import { Pencil, Plus, Check, RotateCcw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { WEEKS, LANES, TOTAL_WEEKS, buildLayout } from "./ganttData";
import useGanttTasks from "./useGanttTasks";
import GanttTaskModal from "./GanttTaskModal";
import "./Gantt.css";

export default function GanttPage() {
  const { t } = useLanguage();
  const { tasks, addTask, updateTask, removeTask, resetTasks } = useGanttTasks();

  const [editing, setEditing] = useState(false);
  // draft: null=关闭；{}=新增；{id,...}=编辑某条
  const [draft, setDraft] = useState(null);

  const { lanes, totalRows } = useMemo(() => buildLayout(tasks), [tasks]);

  const handleSave = (patch) => {
    if (draft?.id) updateTask(draft.id, patch);
    else addTask(patch);
    setDraft(null);
  };

  const handleDelete = (id) => {
    removeTask(id);
    setDraft(null);
  };

  const handleReset = () => {
    if (window.confirm(t("gantt.edit.resetConfirm"))) resetTasks();
  };

  // 点任务条：编辑模式下打开编辑弹窗
  const onBarClick = (task) => {
    if (editing) setDraft(task);
  };

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
          <div className="gantt-summary-value">{tasks.length}</div>
          <div className="gantt-summary-label">{t("gantt.stat.tasks")}</div>
        </div>
        <div className="gantt-summary-card">
          <div className="gantt-summary-value">{LANES.length}</div>
          <div className="gantt-summary-label">{t("gantt.stat.tracks")}</div>
        </div>
      </div>

      {/* ── 甘特图卡片 ── */}
      <section className="gantt-card">
        {/* 工具栏：编辑开关 + 新增 / 重置 */}
        <div className="gantt-toolbar">
          {editing && (
            <>
              <button type="button" className="gantt-btn primary sm" onClick={() => setDraft({})}>
                <Plus size={15} aria-hidden="true" />
                {t("gantt.edit.add")}
              </button>
              <button type="button" className="gantt-btn ghost sm" onClick={handleReset}>
                <RotateCcw size={14} aria-hidden="true" />
                {t("gantt.edit.reset")}
              </button>
            </>
          )}
          <button
            type="button"
            className={`gantt-btn sm ${editing ? "primary" : "ghost"}`}
            style={{ marginLeft: "auto" }}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? <Check size={15} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
            {t(editing ? "gantt.edit.done" : "gantt.edit.enter")}
          </button>
        </div>

        <div className="gantt-scroll">
          <div
            className={`gantt-grid${editing ? " is-editing" : ""}`}
            style={{
              "--weeks": TOTAL_WEEKS,
              gridTemplateRows: `auto repeat(${totalRows - 1}, minmax(46px, auto))`,
            }}
          >
            {/* 泳道底色带 */}
            {lanes.map((lane) => (
              <div
                key={`band-${lane.id}`}
                className={`gantt-band lane-${lane.id}`}
                style={{ gridRow: `${lane.startRow} / span ${lane.rows}` }}
              />
            ))}

            {/* 竖向周分隔线 */}
            {WEEKS.map((_, i) => (
              <div
                key={`guide-${i}`}
                className="gantt-guide"
                style={{ gridColumn: i + 2, gridRow: `2 / span ${totalRows - 1}` }}
              />
            ))}

            {/* 左上角 Timeline 表头 */}
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
            {lanes.flatMap((lane) =>
              lane.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={`gantt-bar lane-${lane.id}`}
                  disabled={!editing}
                  style={{
                    gridColumn: `${task.start + 1} / ${task.end + 2}`,
                    gridRow: lane.startRow + task.row,
                  }}
                  onClick={() => onBarClick(task)}
                  title={`${task.title} · ${WEEKS[task.start - 1].label}–${WEEKS[task.end - 1].label}`}
                >
                  <span className="gantt-bar-title">{task.title}</span>
                  {task.tag && <span className="gantt-bar-tag">{task.tag}</span>}
                </button>
              )),
            )}
          </div>
        </div>

        {editing && <p className="gantt-edithint">{t("gantt.edit.hint")}</p>}
      </section>

      {draft !== null && (
        <GanttTaskModal
          draft={draft}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}
