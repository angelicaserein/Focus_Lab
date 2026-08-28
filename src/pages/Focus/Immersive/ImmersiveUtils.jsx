import React, { useEffect, useRef, useState } from "react";
import "./ImmersiveUtils.css";
import { formatTimestamp, formatClock } from "@/utils/time";
import { useLanguage } from "@/context/LanguageContext";

const DISTRACTION_FEEDBACK_MS = 1200;

// 沉浸模式右下角工具栏：随记 + 记录分心（被动/主动）
export default function ImmersiveUtils({
  onAddNote,
  onOpenBrowser,
  onDistraction,
  onProactiveDistraction,
  onReturnFromDistraction,
  isProactiveDistraction = false,
  proactiveDistractionStartTs = null,
  isRunning = false,
  sessionNotes = [],
  sessionDistractionCount = 0,
}) {
  const { t } = useLanguage();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [distractionFeedback, setDistractionFeedback] = useState(false);
  const [distractionElapsed, setDistractionElapsed] = useState(0);
  const textareaRef = useRef(null);
  const historyEndRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  useEffect(() => {
    if (noteOpen) textareaRef.current?.focus();
  }, [noteOpen]);

  // 新笔记保存后滚动到列表底部
  useEffect(() => {
    if (noteOpen) historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionNotes.length, noteOpen]);

  // 主动分心中：每秒更新已过时长
  useEffect(() => {
    if (!isProactiveDistraction || !proactiveDistractionStartTs) {
      setDistractionElapsed(0);
      return undefined;
    }
    const tick = () =>
      setDistractionElapsed(Math.floor((Date.now() - proactiveDistractionStartTs) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isProactiveDistraction, proactiveDistractionStartTs]);

  // 「已记下」那一下的回弹定时器：结束专注会把整个沉浸层卸掉，
  // 而这个 timer 只有 1.2 秒，很容易横跨这一下——不清就是往已卸载的组件里写 state。
  useEffect(() => () => clearTimeout(feedbackTimerRef.current), []);

  const saveNote = () => {
    const t = noteText.trim();
    if (!t) return;
    onAddNote(t);
    setNoteText("");
  };

  const cancelNote = () => {
    setNoteText("");
    setNoteOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveNote();
    }
    if (e.key === "Escape") cancelNote();
  };

  const handleDistraction = () => {
    onDistraction();
    clearTimeout(feedbackTimerRef.current);
    setDistractionFeedback(true);
    feedbackTimerRef.current = setTimeout(() => setDistractionFeedback(false), DISTRACTION_FEEDBACK_MS);
  };

  // 分心中状态：显示计时器 + 回来按钮
  if (isProactiveDistraction) {
    return (
      <div className="immersive-utils">
        <div className="immersive-distraction-mode">
          <div className="immersive-distraction-label">{t("focus.imm.distracting")}</div>
          <div className="immersive-distraction-elapsed">{formatClock(distractionElapsed)}</div>
          <button
            type="button"
            className="immersive-return-btn"
            onClick={onReturnFromDistraction}
          >
            {t("focus.imm.imBack")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="immersive-utils">
      {noteOpen && (
        <div className="immersive-note-panel">
          {sessionNotes.length > 0 && (
            <ul className="immersive-note-history">
              {sessionNotes.map((n) => (
                <li key={n.id} className="immersive-note-history-item">
                  <span className="immersive-note-history-time">{formatTimestamp(n.ts)}</span>
                  <span className="immersive-note-history-text">{n.text}</span>
                </li>
              ))}
              {/* 滚动锚点。<ul> 里只能放 <li>，塞 <div> 是非法结构 */}
              <li ref={historyEndRef} className="immersive-note-history-end" aria-hidden="true" />
            </ul>
          )}

          <textarea
            ref={textareaRef}
            className="immersive-note-textarea"
            placeholder={t(sessionNotes.length ? "focus.imm.notePlaceholderMore" : "focus.imm.notePlaceholder")}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          <div className="immersive-note-actions">
            <button
              type="button"
              className="immersive-note-save"
              onClick={saveNote}
              disabled={!noteText.trim()}
            >
              {t("focus.imm.noteSave")}
            </button>
            <button type="button" className="immersive-note-cancel" onClick={cancelNote}>
              {t("focus.imm.noteClose")}
            </button>
          </div>
        </div>
      )}

      <div className="immersive-util-btns">
        <button
          type="button"
          className={`immersive-util-btn${noteOpen ? " active" : ""}`}
          onClick={() => setNoteOpen((o) => !o)}
          title={t("focus.imm.noteTitle")}
        >
          {t("focus.imm.note")}
          {sessionNotes.length > 0 && (
            <span className="immersive-util-badge">{sessionNotes.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`immersive-util-btn distraction${distractionFeedback ? " feedback" : ""}`}
          onClick={handleDistraction}
          title={t("focus.imm.distractedTitle")}
        >
          {t(distractionFeedback ? "focus.imm.distractedLogged" : "focus.imm.distracted")}
          {sessionDistractionCount > 0 && (
            <span className="immersive-util-badge">{sessionDistractionCount}</span>
          )}
        </button>
        <button
          type="button"
          className="immersive-util-btn proactive"
          onClick={onProactiveDistraction}
          disabled={!isRunning}
          title={t("focus.imm.goDistractTitle")}
        >
          {t("focus.imm.goDistract")}
        </button>
        {/* 应用内的其它页面：不算离开专注——计时照跑，也不落分心记录。
            去任务库改个任务、去备忘录记一笔，本来就是本次专注的一部分。 */}
        <button
          type="button"
          className="immersive-util-btn browse"
          onClick={() => onOpenBrowser("/")}
          title={t("focus.imm.browse.openTitle")}
        >
          {t("focus.imm.browse.open")}
        </button>
        <button
          type="button"
          className="immersive-util-btn browse"
          onClick={() => onOpenBrowser("/settings")}
          title={t("focus.imm.browse.settingsTitle")}
        >
          {t("focus.imm.browse.settings")}
        </button>
      </div>
    </div>
  );
}
