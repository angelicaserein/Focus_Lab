import { useLanguage } from "@/context/LanguageContext";
import React, { useEffect, useState } from "react";

const AUTO_DISMISS_MS = 4000;

// 分心存档后的「已记下 · 撤回」提示。pending 非空即显示，几秒后自动淡出。
// 保留 content 直到离场动画结束，避免文字在淡出途中骤然消失（同 ui/Toast 的做法）。
export default function DistractionUndoToast({ pending, onUndo, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState(null);

  useEffect(() => {
    if (pending) {
      setContent(pending);
      setVisible(true);
      const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
      return () => clearTimeout(id);
    }
    setVisible(false);
    return undefined;
  }, [pending, onDismiss]);

  const handleTransitionEnd = () => {
    if (!visible) setContent(null);
  };

  const { t } = useLanguage();

  if (!content) return null;

  return (
    <div
      className={`toast distraction-undo-toast ${visible ? "visible" : ""}`}
      role="status"
      aria-live="polite"
      onTransitionEnd={handleTransitionEnd}
    >
      <span className="toast-text">
        {t(content.blank ? "focus.distract.loggedBlank" : "focus.distract.logged")}
      </span>
      <button type="button" className="toast-undo" onClick={onUndo}>
        {t("focus.distract.undo")}
      </button>
    </div>
  );
}
