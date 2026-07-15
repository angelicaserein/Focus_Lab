import React, { useEffect, useState } from "react";
import { addDays } from "@/utils/time";
import "@/pages/Memo/AiTaskModal.css";

// 「排截止日」助手：把当前库里还没设截止日的未完成任务列成一张评审表，
// 每行用快捷按钮（今天/明天/+3天/+1周）或日期框排期，底部批量写入。
// 纯手动、不调 AI；视觉复用「分任务」(AiTaskModal) 的 ait-* 外壳。
const PRESETS = [
  { label: "今天", days: 0 },
  { label: "明天", days: 1 },
  { label: "+3天", days: 3 },
  { label: "+1周", days: 7 },
];

export default function DueDateAssistant({ candidates, onAssign, onClose }) {
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
    <div className="ait-backdrop" onClick={onClose}>
      <div className="ait-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ait-head">
          <h2 className="ait-title">排截止日</h2>
          <button type="button" className="ait-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="ait-state">
            <p>当前库里的未完成任务都已经有截止日啦 🌿</p>
            <button type="button" className="ait-btn-ghost" onClick={onClose}>
              关闭
            </button>
          </div>
        ) : (
          <>
            <p className="ait-hint">
              给还没排期的任务点一个截止日，点「今天/明天/…」或选日期，确认后统一写入。
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
                              {p.label}
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
                            title="清除"
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
                取消
              </button>
              <button
                type="button"
                className="ait-btn-primary"
                onClick={handleCommit}
                disabled={chosen.length === 0}
              >
                设置 {chosen.length} 个截止日
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
