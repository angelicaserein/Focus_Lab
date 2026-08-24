import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";

// 通用撤销 toast。调用方传入 pending（{ item, kind } ，kind 缺省按删除处理）、
// undo 和 getText(item)→string。
export default function Toast({ pending, undo, getText }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  // 保留内容直到离场动画结束，避免文字在淡出时突然消失
  const [content, setContent] = useState(null);

  useEffect(() => {
    if (pending) {
      setContent(pending);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [pending]);

  const handleTransitionEnd = () => {
    if (!visible) setContent(null);
  };

  if (!content) return null;

  // 走 portal 挂到 body：首页 .page-home > * 带 home-enter 动画（transform 收尾于
  // translateY(0)），有 transform 的祖先会成为 position:fixed 的包含块，toast 会
  // 被定位到那张卡的右下角而不是视口——在首页上等于看不见。
  return createPortal(
    <div
      className={`toast ${visible ? "visible" : ""}`}
      role="status"
      aria-live="polite"
      onTransitionEnd={handleTransitionEnd}
    >
      <span className="toast-text">
        {t(content.kind === "complete" ? "toast.completed" : "toast.deleted", {
          text: getText(content.item),
        })}
      </span>
      <button type="button" className="toast-undo" onClick={undo}>
        {t("toast.undo")}
      </button>
    </div>,
    document.body,
  );
}
