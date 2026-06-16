import React, { useState, useEffect, useRef } from "react";
import "./DistractionModal.css";

const TAGS = ["手机/屏幕", "思绪游荡", "外部打扰", "去干别的", "其他"];
const AUTO_CLOSE_SECS = 3;

export default function DistractionModal({ onTag, onUndo, onClose }) {
  const [selectedTag, setSelectedTag] = useState(null);
  const [note, setNote] = useState("");
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECS);
  const countdownRef = useRef(AUTO_CLOSE_SECS);
  const timerRef = useRef(null);
  const interactedRef = useRef(false);

  const stopCountdown = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setCountdown(null);
  };

  const handleInteract = () => {
    if (!interactedRef.current) {
      interactedRef.current = true;
      stopCountdown();
    }
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        onClose();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [onClose]);

  const handleTagSelect = (tag) => {
    handleInteract();
    setSelectedTag((prev) => (prev === tag ? null : tag));
  };

  const handleDone = () => {
    onTag(selectedTag, note.trim());
  };

  const handleUndo = () => {
    stopCountdown();
    onUndo();
  };

  return (
    <div className="distraction-modal-backdrop" onClick={onClose}>
      <div className="distraction-modal" onClick={(e) => e.stopPropagation()}>
        <div className="distraction-modal-title">
          <span>分什么神了？</span>
          {countdown !== null && (
            <span className="distraction-countdown">{countdown}s</span>
          )}
        </div>
        <div className="distraction-tags">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`distraction-tag-btn${selectedTag === tag ? " selected" : ""}`}
              onClick={() => handleTagSelect(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <input
          className="distraction-note-input"
          placeholder="还想记点什么…"
          value={note}
          maxLength={100}
          onChange={(e) => {
            handleInteract();
            setNote(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleDone()}
        />
        <div className="distraction-modal-actions">
          <button type="button" className="distraction-undo-btn" onClick={handleUndo}>
            撤销这次
          </button>
          <button type="button" className="distraction-done-btn" onClick={handleDone}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
