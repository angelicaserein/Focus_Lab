import React, { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LANES, WEEKS, TAG_SUGGESTIONS, TOTAL_WEEKS } from "./ganttData";

// 甘特任务的新增 / 编辑弹窗。draft 为 null 表示「新增」，否则为「编辑」。
export default function GanttTaskModal({ draft, onSave, onDelete, onClose }) {
  const { t } = useLanguage();
  const isEdit = Boolean(draft?.id);

  const [form, setForm] = useState(() => ({
    lane: draft?.lane ?? LANES[0].id,
    title: draft?.title ?? "",
    tag: draft?.tag ?? "",
    start: draft?.start ?? 1,
    end: draft?.end ?? 1,
  }));

  // 按 Esc 关闭
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      // 起始周不能晚于结束周：改 start 时顶着 end 走，反之亦然
      if (k === "start" && Number(value) > Number(next.end)) next.end = value;
      if (k === "end" && Number(value) < Number(next.start)) next.start = value;
      return next;
    });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      lane: form.lane,
      title: form.title,
      tag: form.tag,
      start: Number(form.start),
      end: Number(form.end),
    });
  };

  return (
    <div className="gantt-modal-backdrop" onClick={onClose}>
      <form
        className="gantt-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
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
            <select value={form.lane} onChange={set("lane")}>
              {LANES.map((l) => (
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
            <span>{t("gantt.edit.startWeek")}</span>
            <select value={form.start} onChange={set("start")}>
              {WEEKS.map((w, i) => (
                <option key={w.label} value={i + 1}>{w.label} · {w.range}</option>
              ))}
            </select>
          </label>

          <label className="gantt-field">
            <span>{t("gantt.edit.endWeek")}</span>
            <select value={form.end} onChange={set("end")}>
              {WEEKS.map((w, i) => (
                <option key={w.label} value={i + 1} disabled={i + 1 < Number(form.start)}>
                  {w.label} · {w.range}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="gantt-modal-foot">
          {isEdit && (
            <button
              type="button"
              className="gantt-btn danger"
              onClick={() => onDelete(draft.id)}
            >
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

        <p className="gantt-modal-hint">
          {t("gantt.edit.spanHint", {
            weeks: Number(form.end) - Number(form.start) + 1,
            max: TOTAL_WEEKS,
          })}
        </p>
      </form>
    </div>
  );
}
