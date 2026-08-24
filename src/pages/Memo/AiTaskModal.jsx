import React, { useEffect, useMemo, useState } from "react";
import { sanitizeTaskAttrs } from "@/utils/ai/aiTasks";
import { optionLabel } from "@/utils/task/taskAttrUtils";
import { aiErrorText } from "@/utils/ai/aiClient";
import { useLanguage } from "@/context/LanguageContext";
import "./AiTaskModal.css";

// 把已清洗的 attrs 渲染成只读 chips（优先级带色点、标签、截止、备注）。
// t 从组件传进来：chip 里有「截止 / 备注」这类要翻译的固定词。
function attrChips(attrs, database, t) {
  const byId = new Map((database?.attrs ?? []).map((a) => [a.id, a]));
  const chips = [];

  if (attrs.priority) {
    const opt = (byId.get("priority")?.options ?? []).find((o) => o.id === attrs.priority);
    if (opt) chips.push({ key: "priority", color: opt.color, label: optionLabel(t, opt) });
  }
  if (attrs.tags?.length) {
    const opts = byId.get("tags")?.options ?? [];
    const labels = attrs.tags
      .map((id) => {
        const opt = opts.find((o) => o.id === id);
        return opt ? optionLabel(t, opt) : "";
      })
      .filter(Boolean);
    if (labels.length) chips.push({ key: "tags", label: labels.join(" · ") });
  }
  if (attrs.dueDate) {
    chips.push({ key: "dueDate", label: t("memo.ai.chipDue", { date: attrs.dueDate }) });
  }
  if (attrs.notes) chips.push({ key: "notes", label: t("memo.ai.chipNotes") });
  return chips;
}

// 细化出来的行要有稳定且不重复的 key —— 用原索引拼标题会跟新拆出来的撞上。
let refineSeq = 0;

// onRefine?: (task) => Promise<[{text, attrs}]>，给了才显示每行的「再细化」。
// 倒脑子和备忘录「整理成任务」都传；截止日期助手不调 AI，不传。
export default function AiTaskModal({
  status, candidates, error, database, clarifySkipped, onRefine, onCommit, onClose,
}) {
  const { t } = useLanguage();
  // 本地可编辑副本：候选变化时重新播种（标题可改、勾选可切换）。
  const [rows, setRows] = useState([]);
  // 细化中的那一行 key、细化报错、以及可回退的历史快照（每次细化压一层）
  const [refining, setRefining] = useState(null);
  const [refineError, setRefineError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setRows(
      candidates.map((c, i) => ({
        key: `${i}-${c.text}`,
        text: c.text,
        attrs: c.attrs || {},
        selected: true,
      })),
    );
    setHistory([]);
    setRefineError(null);
  }, [candidates]);

  // 把某一行原地换成它拆出来的几条。拆不动（返回空）就提示一句、保持原样。
  const handleRefine = async (row) => {
    if (refining) return;
    setRefining(row.key);
    setRefineError(null);
    try {
      const parts = await onRefine({ text: row.text, attrs: row.attrs });
      if (!parts?.length) {
        setRefineError(t("memo.ai.refineNone"));
        return;
      }
      setHistory((prev) => [...prev, rows]);
      setRows((prev) => {
        const at = prev.findIndex((r) => r.key === row.key);
        if (at === -1) return prev;
        const made = parts.map((p) => ({
          key: `r${refineSeq++}`,
          text: p.text,
          attrs: p.attrs || {},
          selected: row.selected,
        }));
        return [...prev.slice(0, at), ...made, ...prev.slice(at + 1)];
      });
    } catch (e) {
      setRefineError(aiErrorText(t, e, "memo.ai.refineFailed"));
    } finally {
      setRefining(null);
    }
  };

  const undoRefine = () => {
    setRefineError(null);
    setHistory((prev) => {
      if (!prev.length) return prev;
      setRows(prev[prev.length - 1]);
      return prev.slice(0, -1);
    });
  };

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
          <h2 className="ait-title">{t("memo.ai.title")}</h2>
          <button type="button" className="ait-close" onClick={onClose} aria-label={t("memo.ai.close")}>
            ✕
          </button>
        </div>

        {status === "loading" && (
          <div className="ait-state">
            <span className="ait-spinner" />
            <p>{t("memo.ai.loading")}</p>
          </div>
        )}

        {status === "error" && (
          <div className="ait-state">
            <p className="ait-error">{error || t("memo.ai.error")}</p>
            <button type="button" className="ait-btn-ghost" onClick={onClose}>
              {t("memo.ai.close")}
            </button>
          </div>
        )}

        {status === "review" && rows.length === 0 && (
          <div className="ait-state">
            <p>{t("memo.ai.noTasks")}</p>
            <button type="button" className="ait-btn-ghost" onClick={onClose}>
              {t("memo.ai.close")}
            </button>
          </div>
        )}

        {status === "review" && rows.length > 0 && (
          <>
            {clarifySkipped && <p className="ait-note">{t("memo.ai.noClarify")}</p>}
            <p className="ait-hint">{t("memo.ai.hint")}</p>

            <ul className="ait-list">
              {rows.map((r, i) => {
                const chips = attrChips(perRow[i], database, t);
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
                        placeholder={t("memo.ai.taskPlaceholder")}
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
                    {onRefine && (
                      <button
                        type="button"
                        className="ait-refine"
                        onClick={() => handleRefine(r)}
                        disabled={Boolean(refining) || !r.text.trim()}
                        title={t("memo.ai.refine")}
                      >
                        {refining === r.key ? t("memo.ai.refining") : t("memo.ai.refine")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {(refineError || history.length > 0) && (
              <div className="ait-refine-bar">
                {refineError && <span className="ait-error">{refineError}</span>}
                {history.length > 0 && (
                  <button type="button" className="ait-btn-ghost" onClick={undoRefine}>
                    {t("memo.ai.refineUndo")}
                  </button>
                )}
              </div>
            )}

            {droppedAll.length > 0 && (
              <p className="ait-dropped">
                {t("memo.ai.dropped", { names: droppedAll.join(t("memo.ai.listSep")) })}
              </p>
            )}

            <div className="ait-actions">
              <button type="button" className="ait-btn-ghost" onClick={onClose}>
                {t("memo.ai.cancel")}
              </button>
              <button
                type="button"
                className="ait-btn-primary"
                onClick={handleCommit}
                disabled={selectedCount === 0}
              >
                {t("memo.ai.commit", { count: selectedCount })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
