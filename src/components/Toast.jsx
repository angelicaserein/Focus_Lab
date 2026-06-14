import React, { useEffect, useState } from "react";
import { useTodos } from "../context/TodoContext";

export default function Toast() {
  const { pendingDelete, undoDelete } = useTodos();
  const [visible, setVisible] = useState(false);
  // 保留内容直到离场动画结束，避免文字在淡出时突然消失
  const [content, setContent] = useState(null);

  useEffect(() => {
    if (pendingDelete) {
      setContent(pendingDelete);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [pendingDelete]);

  const handleTransitionEnd = () => {
    if (!visible) setContent(null);
  };

  if (!content) return null;

  return (
    <div
      className={`toast ${visible ? "visible" : ""}`}
      role="status"
      aria-live="polite"
      onTransitionEnd={handleTransitionEnd}
    >
      <span className="toast-text">已删除「{content.item.text}」</span>
      <button type="button" className="toast-undo" onClick={undoDelete}>
        撤销
      </button>
    </div>
  );
}
