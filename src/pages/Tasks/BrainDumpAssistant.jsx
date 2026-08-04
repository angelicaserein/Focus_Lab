import React, { useEffect, useState } from "react";
import useTaskExtraction from "@/hooks/task/useTaskExtraction";
import { useDatabases } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import AiTaskModal from "@/pages/Memo/AiTaskModal";
import "@/pages/Memo/AiTaskModal.css";

// 「倒脑子」助手：把脑子里乱糟糟的事一股脑写下来，AI 拆成候选任务，
// 再交给 AiTaskModal 评审、落到当前任务库。视觉复用「分任务」的 ait-* 外壳。
// 整理中/评审/出错时由 AiTaskModal 接管，关掉它会退回输入框且原文还在，方便改了再试。
export default function BrainDumpAssistant({ onClose, onAdded }) {
  const { activeDatabase } = useDatabases();
  const { t } = useLanguage();
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
      <div
        className="ait-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("brainDump.title")}
      >
        <div className="ait-head">
          <h2 className="ait-title">{t("brainDump.title")}</h2>
          <button
            type="button"
            className="ait-close"
            onClick={() => onClose()}
            aria-label={t("brainDump.close")}
          >
            ✕
          </button>
        </div>

        <p className="ait-hint">{t("brainDump.hint")}</p>

        <textarea
          className="bd-input"
          rows={8}
          autoFocus
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          placeholder={t("brainDump.placeholder")}
          aria-label={t("brainDump.title")}
        />

        <div className="ait-actions">
          <button type="button" className="ait-btn-ghost" onClick={() => onClose()}>
            {t("brainDump.cancel")}
          </button>
          <button
            type="button"
            className="ait-btn-primary"
            onClick={() => ai.request(dump)}
            disabled={!dump.trim()}
          >
            {t("brainDump.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
