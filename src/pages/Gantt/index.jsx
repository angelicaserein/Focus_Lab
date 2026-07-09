import React, { useMemo, useState } from "react";
import { Pencil, Plus, Check, Settings2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import useGanttProjects from "./useGanttProjects";
import { buildColumns, buildLayout } from "./ganttDate";
import GanttTaskModal from "./GanttTaskModal";
import GanttProjectModal from "./GanttProjectModal";
import "./Gantt.css";

export default function GanttPage() {
  const { t, lang } = useLanguage();
  const {
    projects, active, setActiveId,
    addProject, updateProject, removeProject,
    addLane, renameLane, removeLane, moveLane,
    addTask, updateTask, removeTask,
  } = useGanttProjects();

  const [editing, setEditing] = useState(false);
  // draft: null=关闭；{}=新增任务；{id,...}=编辑某条
  const [draft, setDraft] = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const columns = useMemo(
    () => (active ? buildColumns(active.startDate, active.endDate, active.unit, lang) : []),
    [active, lang],
  );
  const { lanes, totalRows } = useMemo(
    () => (active ? buildLayout(active, columns) : { lanes: [], totalRows: 1 }),
    [active, columns],
  );

  const handleSaveTask = (patch) => {
    if (draft?.id) updateTask(draft.id, patch);
    else addTask(patch);
    setDraft(null);
  };

  const handleDeleteTask = (id) => {
    removeTask(id);
    setDraft(null);
  };

  const onBarClick = (task) => {
    if (editing) setDraft(task);
  };

  const handleAddProject = () => {
    addProject(t("gantt.project.newName"));
    setProjectModalOpen(true);
    setEditing(true);
  };

  // ── 空状态：一个项目都没有 ──
  if (!active) {
    return (
      <div className="page-gantt">
        <div className="gantt-headline">
          <h1>{t("gantt.title")}</h1>
          <p>{t("gantt.subtitle")}</p>
        </div>
        <div className="gantt-empty">
          <p>{t("gantt.empty.noProject")}</p>
          <button type="button" className="gantt-btn primary" onClick={handleAddProject}>
            <Plus size={16} aria-hidden="true" />
            {t("gantt.project.add")}
          </button>
        </div>
      </div>
    );
  }

  const unitLabel = t(`gantt.unit.${active.unit}`);

  return (
    <div className="page-gantt">
      {/* ── 页头 ── */}
      <div className="gantt-headline">
        <h1>{t("gantt.title")}</h1>
        <p>{t("gantt.subtitle")}</p>
      </div>

      {/* ── 项目切换条 ── */}
      <div className="gantt-projbar" role="tablist" aria-label={t("gantt.project.switch")}>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === active.id}
            className={`gantt-projtab${p.id === active.id ? " is-active" : ""}`}
            onClick={() => setActiveId(p.id)}
          >
            {p.name}
          </button>
        ))}
        <button type="button" className="gantt-projtab add" onClick={handleAddProject}>
          <Plus size={14} aria-hidden="true" />
          {t("gantt.project.add")}
        </button>
      </div>

      {/* ── 概览卡 ── */}
      <div className="gantt-summary">
        <div className="gantt-summary-card accent">
          <div className="gantt-summary-value">{columns.length}</div>
          <div className="gantt-summary-label">{unitLabel}</div>
        </div>
        <div className="gantt-summary-card">
          <div className="gantt-summary-value">{active.tasks.length}</div>
          <div className="gantt-summary-label">{t("gantt.stat.tasks")}</div>
        </div>
        <div className="gantt-summary-card">
          <div className="gantt-summary-value">{active.lanes.length}</div>
          <div className="gantt-summary-label">{t("gantt.stat.tracks")}</div>
        </div>
      </div>

      {/* ── 甘特图卡片 ── */}
      <section className="gantt-card">
        {/* 工具栏 */}
        <div className="gantt-toolbar">
          {editing && (
            <>
              <button type="button" className="gantt-btn primary sm" onClick={() => setDraft({})}>
                <Plus size={15} aria-hidden="true" />
                {t("gantt.edit.add")}
              </button>
              <button type="button" className="gantt-btn ghost sm" onClick={() => setProjectModalOpen(true)}>
                <Settings2 size={14} aria-hidden="true" />
                {t("gantt.project.settings")}
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

        {columns.length === 0 ? (
          <div className="gantt-empty inner">
            <p>{t("gantt.empty.badRange")}</p>
          </div>
        ) : (
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
        )}

        {editing && <p className="gantt-edithint">{t("gantt.edit.hint")}</p>}
      </section>

      {draft !== null && (
        <GanttTaskModal
          draft={draft}
          project={active}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => setDraft(null)}
        />
      )}

      {projectModalOpen && (
        <GanttProjectModal
          project={active}
          canDelete={projects.length > 1}
          onUpdate={(patch) => updateProject(active.id, patch)}
          onDelete={() => {
            removeProject(active.id);
            setProjectModalOpen(false);
          }}
          onAddLane={addLane}
          onRenameLane={renameLane}
          onRemoveLane={removeLane}
          onMoveLane={moveLane}
          onClose={() => setProjectModalOpen(false)}
        />
      )}
    </div>
  );
}
