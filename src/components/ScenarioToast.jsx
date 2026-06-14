import React, { useEffect, useState } from "react";
import { useScenarios } from "../context/ScenarioContext";

export default function ScenarioToast() {
  const { pendingDelete, undoDelete } = useScenarios();
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
      <span className="toast-text">已删除「{content.item.title}」</span>
      <button type="button" className="toast-undo" onClick={undoDelete}>
        撤销
      </button>
    </div>
  );
}
