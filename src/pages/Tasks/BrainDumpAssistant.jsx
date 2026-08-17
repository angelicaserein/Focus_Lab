import React, { useEffect, useState } from "react";
import useTaskExtraction from "@/hooks/task/useTaskExtraction";
import { useDatabases } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import AiTaskModal from "@/pages/Memo/AiTaskModal";
import ClarifyPanel from "@/pages/Tasks/ClarifyPanel";
import "@/pages/Memo/AiTaskModal.css";

// 「倒脑子」助手：把脑子里乱糟糟的事一股脑写下来，AI 拆成候选任务，
// 再交给 AiTaskModal 评审、落到当前任务库。视觉复用「分任务」的 ait-* 外壳。
// 整理中/评审/出错时由 AiTaskModal 接管，关掉它会退回输入框且原文还在，方便改了再试。
//
// 中间可能插一屏 ClarifyPanel：设置页开了「先反问」且模型确实有要问的时候，
// 先让用户点几下确认拆法，再进抽取。拆分粒度等长期偏好在设置页「任务拆分」里。
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

  // 把新任务的 id 交回页面，那边才好给一个「撤回」的机会
  const handleCommit = (tasks) => {
    const ids = ai.commit(tasks);
    if (ids.length > 0) onAdded(ids);
    onClose();
  };

  if (ai.status === "asking") {
    return (
      <ClarifyPanel
        questions={ai.questions}
        onSubmit={ai.answer}
        onSkip={() => ai.answer([])}
        onClose={ai.close}
      />
    );
  }

  if (ai.isOpen) {
    return (
      <AiTaskModal
        status={ai.status}
        candidates={ai.candidates}
        error={ai.error}
        database={activeDatabase}
        onRefine={ai.refine}
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
