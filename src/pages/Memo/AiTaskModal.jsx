import React, { useEffect, useMemo, useState } from "react";
import { sanitizeTaskAttrs } from "@/utils/ai/aiTasks";
import "./AiTaskModal.css";

// 把已清洗的 attrs 渲染成只读 chips（优先级带色点、标签、截止、时长、备注）。
function attrChips(attrs, database) {
  const byId = new Map((database?.attrs ?? []).map((a) => [a.id, a]));
  const chips = [];

  if (attrs.priority) {
    const opt = (byId.get("priority")?.options ?? []).find((o) => o.id === attrs.priority);
    if (opt) chips.push({ key: "priority", color: opt.color, label: opt.label });
  }
  if (attrs.tags?.length) {
    const opts = byId.get("tags")?.options ?? [];
    const labels = attrs.tags
      .map((id) => opts.find((o) => o.id === id)?.label)
      .filter(Boolean);
    if (labels.length) chips.push({ key: "tags", label: labels.join(" · ") });
  }
  if (attrs.dueDate) chips.push({ key: "dueDate", label: `截止 ${attrs.dueDate}` });
  if (attrs.estimatedMins != null) {
    const unit = byId.get("estimatedMins")?.unit || "分钟";
    chips.push({ key: "estimatedMins", label: `${attrs.estimatedMins}${unit}` });
  }
  if (attrs.notes) chips.push({ key: "notes", label: "备注" });
  return chips;
}

export default function AiTaskModal({ status, candidates, error, database, onCommit, onClose }) {
  // 本地可编辑副本：候选变化时重新播种（标题可改、勾选可切换）。
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setRows(
      candidates.map((c, i) => ({
        key: `${i}-${c.text}`,
        text: c.text,
        attrs: c.attrs || {},
        selected: true,
      })),
    );
  }, [candidates]);

  // Esc 关闭
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 每行针对当前库清洗后的 attrs（决定显示哪些 chips），以及全局被丢弃的列名。
  const { perRow, droppedAll } = useMemo(() => {
    const dropped = new Set();
    const per = rows.map((r) => {
      const { attrs, dropped: d } = sanitizeTaskAttrs(r.attrs, database);
      d.forEach((name) => dropped.add(name));
      return attrs;
    });
    return { perRow: per, droppedAll: [...dropped] };
  }, [rows, database]);

  const selectedCount = rows.filter((r) => r.selected).length;

  const toggle = (key) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r)));

  const editText = (key, text) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, text } : r)));

  const handleCommit = () => {
    const chosen = rows.filter((r) => r.selected && r.text.trim());
    if (chosen.length) onCommit(chosen.map((r) => ({ text: r.text, attrs: r.attrs })));
  };

  return (
    <div className="ait-backdrop" onClick={onClose}>
      <div className="ait-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ait-head">
          <h2 className="ait-title">AI 整理成任务</h2>
          <button type="button" className="ait-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        {status === "loading" && (
          <div className="ait-state">
            <span className="ait-spinner" />
            <p>AI 正在帮你整理…</p>
          </div>
        )}

        {status === "error" && (
          <div className="ait-state">
            <p className="ait-error">{error || "整理失败，请稍后再试"}</p>
            <button type="button" className="ait-btn-ghost" onClick={onClose}>
              关闭
            </button>
          </div>
        )}

        {status === "review" && rows.length === 0 && (
          <div className="ait-state">
            <p>没有识别到可执行的任务，换一段话试试？</p>
            <button type="button" className="ait-btn-ghost" onClick={onClose}>
              关闭
            </button>
          </div>
        )}

        {status === "review" && rows.length > 0 && (
          <>
            <p className="ait-hint">勾选要加入的任务，可直接修改标题。确认后加入当前任务库。</p>

            <ul className="ait-list">
              {rows.map((r, i) => {
                const chips = attrChips(perRow[i], database);
                return (
                  <li key={r.key} className={`ait-row${r.selected ? "" : " off"}`}>
                    <label className="ait-check">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={() => toggle(r.key)}
                      />
                    </label>
                    <div className="ait-row-body">
                      <input
                        className="ait-row-input"
                        value={r.text}
                        onChange={(e) => editText(r.key, e.target.value)}
                        placeholder="任务标题"
                      />
                      {chips.length > 0 && (
                        <div className="ait-chips">
                          {chips.map((c) => (
                            <span key={c.key} className="ait-chip">
                              {c.color && (
                                <span className="ait-dot" style={{ background: c.color }} />
                              )}
                              {c.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {droppedAll.length > 0 && (
              <p className="ait-dropped">
                当前任务库没有「{droppedAll.join("、")}」列，这些字段不会保存。
                可在任务页为当前库添加这些列后再整理。
              </p>
            )}

            <div className="ait-actions">
              <button type="button" className="ait-btn-ghost" onClick={onClose}>
                取消
              </button>
              <button
                type="button"
                className="ait-btn-primary"
                onClick={handleCommit}
                disabled={selectedCount === 0}
              >
                加入 {selectedCount} 条任务
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
