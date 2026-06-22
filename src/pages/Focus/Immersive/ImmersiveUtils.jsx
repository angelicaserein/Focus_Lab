import React, { useEffect, useRef, useState } from "react";
import "./ImmersiveUtils.css";
import { formatTimestamp, formatClock } from "../../../utils/time";

const DISTRACTION_FEEDBACK_MS = 1200;

// 沉浸模式右下角工具栏：随记 + 记录分心（被动/主动）
export default function ImmersiveUtils({
  onAddNote,
  onDistraction,
  onProactiveDistraction,
  onReturnFromDistraction,
  isProactiveDistraction = false,
  proactiveDistractionStartTs = null,
  isRunning = false,
  sessionNotes = [],
  sessionDistractionCount = 0,
}) {
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
          <div className="immersive-distraction-label">分心中</div>
          <div className="immersive-distraction-elapsed">{formatClock(distractionElapsed)}</div>
          <button
            type="button"
            className="immersive-return-btn"
            onClick={onReturnFromDistraction}
          >
            我回来了
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
              <div ref={historyEndRef} />
            </ul>
          )}

          <textarea
            ref={textareaRef}
            className="immersive-note-textarea"
            placeholder={sessionNotes.length ? "再记一条… (Enter 保存)" : "记录此刻的想法… (Enter 保存，Shift+Enter 换行)"}
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
              保存
            </button>
            <button type="button" className="immersive-note-cancel" onClick={cancelNote}>
              关闭
            </button>
          </div>
        </div>
      )}

      <div className="immersive-util-btns">
        <button
          type="button"
          className={`immersive-util-btn${noteOpen ? " active" : ""}`}
          onClick={() => setNoteOpen((o) => !o)}
          title="快速记录想法"
        >
          ✏ 随记
          {sessionNotes.length > 0 && (
            <span className="immersive-util-badge">{sessionNotes.length}</span>
          )}
        </button>
        <div className="immersive-distraction-btns">
          <button
            type="button"
            className={`immersive-util-btn distraction${distractionFeedback ? " feedback" : ""}`}
            onClick={handleDistraction}
            title="记录一次刚刚发生的分心"
          >
            {distractionFeedback ? "已记录 ✓" : "⚡ 刚刚分心了"}
            {sessionDistractionCount > 0 && (
              <span className="immersive-util-badge">{sessionDistractionCount}</span>
            )}
          </button>
          <button
            type="button"
            className="immersive-util-btn proactive"
            onClick={onProactiveDistraction}
            disabled={!isRunning}
            title="暂停专注，去处理别的事"
          >
            🚶 去分心一下
          </button>
        </div>
      </div>
    </div>
  );
}
