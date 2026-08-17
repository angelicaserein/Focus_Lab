import React, { useEffect, useState } from "react";
import { X, Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import useConfirm from "@/hooks/common/useConfirm";
import { UNITS } from "./ganttDate";

// 项目设置弹窗：改名 / 时间轴（粒度 + 起止日期）/ 泳道增删改排 / 删除项目。
// 各项改动即时生效（直接调 hook 的 update*），不做「保存/取消」缓冲。
export default function GanttProjectModal({
  project, canDelete,
  onUpdate, onDelete,
  onAddLane, onRenameLane, onRemoveLane, onMoveLane,
  onClose,
}) {
  const { t } = useLanguage();
  const [confirm, confirmDialog] = useConfirm();
  const [newLane, setNewLane] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addLane = () => {
    onAddLane(newLane);
    setNewLane("");
  };

  return (
    <div className="gantt-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="gantt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gantt-modal-head">
          <h2>{t("gantt.project.settings")}</h2>
          <button type="button" className="gantt-modal-close" onClick={onClose} aria-label={t("gantt.edit.cancel")}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* 名称 */}
        <label className="gantt-field">
          <span>{t("gantt.project.name")}</span>
          <input type="text" value={project.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        </label>

        {/* 时间轴：粒度 + 起止日期 */}
        <label className="gantt-field">
          <span>{t("gantt.project.unit")}</span>
          <select value={project.unit} onChange={(e) => onUpdate({ unit: e.target.value })}>
            {UNITS.map((u) => (
              <option key={u} value={u}>{t(`gantt.unit.${u}`)}</option>
            ))}
          </select>
        </label>

        <div className="gantt-field-row">
          <label className="gantt-field">
            <span>{t("gantt.project.startDate")}</span>
            <input type="date" value={project.startDate} onChange={(e) => onUpdate({ startDate: e.target.value })} />
          </label>
          <label className="gantt-field">
            <span>{t("gantt.project.endDate")}</span>
            <input
              type="date"
              value={project.endDate}
              min={project.startDate}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
            />
          </label>
        </div>

        {/* 泳道管理 */}
        <div className="gantt-field">
          <span>{t("gantt.project.lanes")}</span>
          <ul className="gantt-lanelist">
            {project.lanes.map((lane, i) => (
              <li key={lane.id} className="gantt-lanerow">
                <input
                  type="text"
                  value={lane.label}
                  onChange={(e) => onRenameLane(lane.id, e.target.value)}
                  aria-label={t("gantt.project.laneName")}
                />
                <div className="gantt-lanerow-actions">
                  <button
                    type="button"
                    className="gantt-iconbtn"
                    disabled={i === 0}
                    onClick={() => onMoveLane(lane.id, -1)}
                    aria-label={t("gantt.project.moveUp")}
                  >
                    <ChevronUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="gantt-iconbtn"
                    disabled={i === project.lanes.length - 1}
                    onClick={() => onMoveLane(lane.id, 1)}
                    aria-label={t("gantt.project.moveDown")}
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="gantt-iconbtn danger"
                    disabled={project.lanes.length <= 1}
                    onClick={() => onRemoveLane(lane.id)}
                    aria-label={t("gantt.edit.delete")}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="gantt-laneadd">
            <input
              type="text"
              value={newLane}
              placeholder={t("gantt.project.laneName")}
              onChange={(e) => setNewLane(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLane();
                }
              }}
            />
            <button type="button" className="gantt-btn ghost sm" onClick={addLane}>
              <Plus size={15} aria-hidden="true" />
              {t("gantt.project.addLane")}
            </button>
          </div>
        </div>

        {/* 删除项目 */}
        <div className="gantt-modal-foot">
          {canDelete && (
            <button
              type="button"
              className="gantt-btn danger"
              onClick={async () => {
                const ok = await confirm({
                  title: t("gantt.project.deleteConfirm"),
                  message: t("gantt.project.deleteConfirmDetail"),
                  confirmLabel: t("common.delete"),
                  danger: true,
                });
                if (ok) onDelete();
              }}
            >
              <Trash2 size={15} aria-hidden="true" />
              {t("gantt.project.delete")}
            </button>
          )}
          <div className="gantt-modal-foot-right">
            <button type="button" className="gantt-btn primary" onClick={onClose}>
              {t("gantt.project.done")}
            </button>
          </div>
        </div>

        {confirmDialog}
      </div>
    </div>
  );
}
