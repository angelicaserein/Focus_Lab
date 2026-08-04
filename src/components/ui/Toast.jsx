import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

// 通用撤销 toast。调用方传入 pendingDelete、undoDelete 和 getText(item)→string。
export default function Toast({ pendingDelete, undoDelete, getText }) {
  const { t } = useLanguage();
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
      <span className="toast-text">{t("toast.deleted", { text: getText(content.item) })}</span>
      <button type="button" className="toast-undo" onClick={undoDelete}>
        {t("toast.undo")}
      </button>
    </div>
  );
}
