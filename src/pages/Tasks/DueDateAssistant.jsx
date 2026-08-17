import React, { useEffect, useState } from "react";
import { addDays } from "@/utils/time";
import { useLanguage } from "@/context/LanguageContext";
import "@/pages/Memo/AiTaskModal.css";

// 「排截止日」助手：把当前库里还没设截止日的未完成任务列成一张评审表，
// 每行用快捷按钮（今天/明天/+3天/+1周）或日期框排期，底部批量写入。
// 纯手动、不调 AI；视觉复用「分任务」(AiTaskModal) 的 ait-* 外壳。
const PRESETS = [
  { labelKey: "common.today", days: 0 },
  { labelKey: "tasks.due.tomorrow", days: 1 },
  { labelKey: "tasks.due.plus3d", days: 3 },
  { labelKey: "tasks.due.plus1w", days: 7 },
];

export default function DueDateAssistant({ candidates, onAssign, onClose }) {
  const { t } = useLanguage();
  // 本地草稿：{ [todoId]: "YYYY-MM-DD" }。确认时一次性写入。
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setDate = (id, date) =>
    setDrafts((prev) => {
      if (!date) {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: date };
    });

  const chosen = Object.entries(drafts);

  const handleCommit = () => {
    chosen.forEach(([id, date]) => onAssign(id, date));
    onClose();
  };

  return (
    <div className="ait-backdrop" role="presentation" onClick={onClose}>
      <div className="ait-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ait-head">
          <h2 className="ait-title">{t("tasks.due.title")}</h2>
          <button type="button" className="ait-close" onClick={onClose} aria-label={t("brainDump.close")}>
            ✕
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="ait-state">
            <p>{t("tasks.due.allSet")}</p>
            <button type="button" className="ait-btn-ghost" onClick={onClose}>
              {t("brainDump.close")}
            </button>
          </div>
        ) : (
          <>
            <p className="ait-hint">
              {t("tasks.due.hint")}
            </p>

            <ul className="ait-list">
              {candidates.map((todo) => {
                const date = drafts[todo.id] || "";
                return (
                  <li key={todo.id} className={`ait-row${date ? "" : " off"}`}>
                    <div className="ait-row-body">
                      <span className="dda-task">{todo.text}</span>
                      <div className="dda-controls">
                        {PRESETS.map((p) => {
                          const d = addDays(p.days);
                          return (
                            <button
                              key={p.days}
                              type="button"
                              className={`date-preset-btn${date === d ? " active" : ""}`}
                              onClick={() => setDate(todo.id, d)}
                            >
                              {t(p.labelKey)}
                            </button>
                          );
                        })}
                        <input
                          className="cell-input date-input dda-date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(todo.id, e.target.value)}
                        />
                        {date && (
                          <button
                            type="button"
                            className="dda-clear"
                            onClick={() => setDate(todo.id, null)}
                            title={t("tasks.clear")}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="ait-actions">
              <button type="button" className="ait-btn-ghost" onClick={onClose}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="ait-btn-primary"
                onClick={handleCommit}
                disabled={chosen.length === 0}
              >
                {t("tasks.due.commit", { count: chosen.length })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
