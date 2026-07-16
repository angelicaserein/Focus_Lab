import React, { useEffect, useState } from "react";
import useTaskExtraction from "@/hooks/task/useTaskExtraction";
import { useDatabases } from "@/context/DatabaseContext";
import AiTaskModal from "@/pages/Memo/AiTaskModal";
import "@/pages/Memo/AiTaskModal.css";

// 「倒脑子」助手：把脑子里乱糟糟的事一股脑写下来，AI 拆成候选任务，
// 再交给 AiTaskModal 评审、落到当前任务库。视觉复用「分任务」的 ait-* 外壳。
// 整理中/评审/出错时由 AiTaskModal 接管，关掉它会退回输入框且原文还在，方便改了再试。
export default function BrainDumpAssistant({ onClose, onAdded }) {
  const { activeDatabase } = useDatabases();
  const ai = useTaskExtraction();
  const [dump, setDump] = useState("");

  useEffect(() => {
    if (ai.isOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, ai.isOpen]);

  const handleCommit = (tasks) => {
    const n = ai.commit(tasks);
    if (n > 0) onAdded(n);
    onClose();
  };

  if (ai.isOpen) {
    return (
      <AiTaskModal
        status={ai.status}
        candidates={ai.candidates}
        error={ai.error}
        database={activeDatabase}
        onCommit={handleCommit}
        onClose={ai.close}
      />
    );
  }

  return (
    <div className="ait-backdrop" onClick={() => onClose()}>
      <div className="ait-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ait-head">
          <h2 className="ait-title">🧠 倒脑子</h2>
          <button type="button" className="ait-close" onClick={() => onClose()} aria-label="关闭">
            ✕
          </button>
        </div>

        <p className="ait-hint">
          把脑子里乱糟糟的事情一股脑写下来，AI 会拆成可执行的任务，你再挑要哪些。
        </p>

        <textarea
          className="bd-input"
          rows={8}
          autoFocus
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          placeholder="想到什么写什么，不用分条、不用排顺序…"
        />

        <div className="ait-actions">
          <button type="button" className="ait-btn-ghost" onClick={() => onClose()}>
            取消
          </button>
          <button
            type="button"
            className="ait-btn-primary"
            onClick={() => ai.request(dump)}
            disabled={!dump.trim()}
          >
            AI 整理成任务
          </button>
        </div>
      </div>
    </div>
  );
}
