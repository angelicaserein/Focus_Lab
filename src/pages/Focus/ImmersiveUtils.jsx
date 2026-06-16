import React, { useEffect, useRef, useState } from "react";

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// 沉浸模式右下角工具栏：随记 + 记录分心
export default function ImmersiveUtils({
  onAddNote,
  onDistraction,
  sessionNotes = [],
  sessionDistractionCount = 0,
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [distractionFeedback, setDistractionFeedback] = useState(false);
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
    feedbackTimerRef.current = setTimeout(() => setDistractionFeedback(false), 1200);
  };

  const distractionCount = sessionDistractionCount;

  return (
    <div className="immersive-utils">
      {noteOpen && (
        <div className="immersive-note-panel">
          {sessionNotes.length > 0 && (
            <ul className="immersive-note-history">
              {sessionNotes.map((n) => (
                <li key={n.id} className="immersive-note-history-item">
                  <span className="immersive-note-history-time">{fmtTime(n.ts)}</span>
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
        <button
          type="button"
          className={`immersive-util-btn distraction${distractionFeedback ? " feedback" : ""}`}
          onClick={handleDistraction}
          title="记录一次分心"
        >
          {distractionFeedback ? "已记录 ✓" : "⚡ 分心了"}
          {distractionCount > 0 && (
            <span className="immersive-util-badge">{distractionCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}
