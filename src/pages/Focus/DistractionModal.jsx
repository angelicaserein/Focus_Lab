import React, { useState } from "react";
import "./DistractionModal.css";

const TAGS = ["手机/屏幕", "思绪游荡", "外部打扰", "去干别的", "其他"];

// 分心标签浮层。刻意不做「点外面 / 倒计时」自动关闭：输入途中误触外部会把没记完的
// 分心悄悄丢掉。只能走两条明确出口——「完成」(填了内容) 或「懒得写原因」(留空存档)。
export default function DistractionModal({ onTag, onSkip }) {
  const [selectedTag, setSelectedTag] = useState(null);
  const [note, setNote] = useState("");

  const hasContent = Boolean(selectedTag) || note.trim().length > 0;

  const handleTagSelect = (tag) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  };

  const handleDone = () => {
    if (!hasContent) return;
    onTag(selectedTag, note.trim());
  };

  return (
    <div className="distraction-modal-backdrop">
      <div className="distraction-modal">
        <div className="distraction-modal-title">
          <span>分什么神了？</span>
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
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleDone()}
        />
        <div className="distraction-modal-actions">
          <button type="button" className="distraction-skip-btn" onClick={onSkip}>
            懒得写原因
          </button>
          <button
            type="button"
            className="distraction-done-btn"
            onClick={handleDone}
            disabled={!hasContent}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
