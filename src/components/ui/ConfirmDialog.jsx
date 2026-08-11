import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// 全站统一的确认弹窗，替代 window.confirm（系统灰框和自研弹窗语言完全脱节，
// 而且这些确认多半挂在不可撤销的删除上，系统框太轻）。
//
// 走 portal 挂 document.body：调用点常常已经在 Popover / 模态框里，
// 就地渲染会被祖先的 overflow 裁掉。
//
// props：
//   title / message   标题与正文（正文可省）
//   confirmLabel / cancelLabel  按钮文案
//   danger            true 时确认键走危险红（删除类默认给 true）
//   onConfirm / onCancel        点确认 / 取消·Esc·点遮罩
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}) {
  const cardRef = useRef(null);
  const returnToRef = useRef(null);

  // 打开时把焦点搬进弹窗，关掉再还回去；默认落在「取消」上——
  // 这是不可撤销的删除，回车不该顺手就点掉确认。
  useEffect(() => {
    returnToRef.current = document.activeElement;
    cardRef.current?.querySelector(".confirm-cancel")?.focus();
    return () => {
      const el = returnToRef.current;
      if (el && document.contains(el)) el.focus();
    };
  }, []);

  // Esc = 取消。stopPropagation 免得同一下 Esc 把背后的弹窗也一并关了。
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  // 焦点困在弹窗里：Tab 走到尽头绕回开头
  const trapTab = (e) => {
    if (e.key !== "Tab") return;
    const items = cardRef.current?.querySelectorAll("button");
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="confirm-overlay"
      onClick={onCancel}
      /* 这弹窗常从 Popover 里唤起，而 portal 到 body 后在它的 DOM 之外——
         不拦住 mousedown，点弹窗按钮会被 useOutsideClick 当成「点了外面」，
         Popover 连同调用方一起卸载，Promise 永远不 resolve。 */
      onMouseDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <div
        ref={cardRef}
        className="confirm-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="confirm-title">{title}</div>
        {message && <p className="confirm-message">{message}</p>}

        <div className="confirm-actions">
          <button type="button" className="confirm-btn confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-btn confirm-ok${danger ? " danger" : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
