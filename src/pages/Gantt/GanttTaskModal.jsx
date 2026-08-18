import React, { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { TAG_SUGGESTIONS } from "./ganttData";
import { todayISO, diffDays } from "./ganttDate";

// 甘特任务的新增 / 编辑弹窗。draft.id 存在＝编辑，否则＝新增。
// 起止用真实日期（<input type="date">），泳道来自当前项目。
export default function GanttTaskModal({ draft, project, onSave, onDelete, onClose }) {
  const { t } = useLanguage();
  const isEdit = Boolean(draft?.id);
  const lanes = project.lanes;

  const [form, setForm] = useState(() => ({
    laneId: draft?.laneId ?? lanes[0]?.id ?? "",
    title: draft?.title ?? "",
    tag: draft?.tag ?? "",
    start: draft?.start ?? project.startDate ?? todayISO(),
    end: draft?.end ?? draft?.start ?? project.startDate ?? todayISO(),
  }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      // 起始不能晚于结束：改一头就顶着另一头走
      if (k === "start" && value > next.end) next.end = value;
      if (k === "end" && value < next.start) next.start = value;
      return next;
    });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      laneId: form.laneId,
      title: form.title,
      tag: form.tag,
      start: form.start,
      end: form.end,
    });
  };

  const spanDays = diffDays(form.start, form.end) + 1;

  return (
    <div className="gantt-modal-backdrop" onClick={onClose}>
      <form className="gantt-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="gantt-modal-head">
          <h2>{t(isEdit ? "gantt.edit.editTitle" : "gantt.edit.addTitle")}</h2>
          <button type="button" className="gantt-modal-close" onClick={onClose} aria-label={t("gantt.edit.cancel")}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <label className="gantt-field">
          <span>{t("gantt.edit.title")}</span>
          <input
            type="text"
            value={form.title}
            onChange={set("title")}
            placeholder={t("gantt.edit.titlePlaceholder")}
            autoFocus
          />
        </label>

        <div className="gantt-field-row">
          <label className="gantt-field">
            <span>{t("gantt.edit.lane")}</span>
            <select value={form.laneId} onChange={set("laneId")}>
              {lanes.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </label>

          <label className="gantt-field">
            <span>{t("gantt.edit.tag")}</span>
            <input
              type="text"
              value={form.tag}
              onChange={set("tag")}
              list="gantt-tag-suggestions"
              placeholder={t("gantt.edit.tagPlaceholder")}
            />
            <datalist id="gantt-tag-suggestions">
              {TAG_SUGGESTIONS.map((tag) => <option key={tag} value={tag} />)}
            </datalist>
          </label>
        </div>

        <div className="gantt-field-row">
          <label className="gantt-field">
            <span>{t("gantt.edit.startDate")}</span>
            <input type="date" value={form.start} onChange={set("start")} />
          </label>

          <label className="gantt-field">
            <span>{t("gantt.edit.endDate")}</span>
            <input type="date" value={form.end} min={form.start} onChange={set("end")} />
          </label>
        </div>

        <div className="gantt-modal-foot">
          {isEdit && (
            <button type="button" className="gantt-btn danger" onClick={() => onDelete(draft.id)}>
              <Trash2 size={15} aria-hidden="true" />
              {t("gantt.edit.delete")}
            </button>
          )}
          <div className="gantt-modal-foot-right">
            <button type="button" className="gantt-btn ghost" onClick={onClose}>
              {t("gantt.edit.cancel")}
            </button>
            <button type="submit" className="gantt-btn primary" disabled={!form.title.trim()}>
              {t("gantt.edit.save")}
            </button>
          </div>
        </div>

        <p className="gantt-modal-hint">{t("gantt.edit.spanHint", { days: spanDays })}</p>
      </form>
    </div>
  );
}
