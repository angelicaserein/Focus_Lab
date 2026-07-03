import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useOutsideClick from "../hooks/useOutsideClick";

// 把内容渲染到 document.body 的浮层（portal），以 fixed 定位锚定在 anchorEl 下方，
// 避免被祖先的 overflow 滚动容器裁剪。靠近视口右/下边缘时自动翻转对齐。
// anchorEl: 触发元素的 DOM 节点；onClose: 外部点击 / Esc 关闭回调。
const MARGIN = 8;

export default function Popover({ anchorEl, onClose, children, className = "" }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useOutsideClick(ref, onClose, true);

  useLayoutEffect(() => {
    if (!anchorEl || !ref.current) return;

    function place() {
      const a = anchorEl.getBoundingClientRect();
      const p = ref.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 默认在锚点左对齐、下方展开
      let left = a.left;
      let top = a.bottom + 4;

      // 右边缘翻转：改为右对齐锚点右边
      if (left + p.width > vw - MARGIN) {
        left = Math.max(MARGIN, a.right - p.width);
      }
      // 下边缘翻转：改为在锚点上方展开
      if (top + p.height > vh - MARGIN && a.top - p.height - 4 > MARGIN) {
        top = a.top - p.height - 4;
      }
      // 兜底夹紧
      left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - p.width - MARGIN));
      top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - p.height - MARGIN));

      setPos({ top, left });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorEl]);

  return createPortal(
    <div
      ref={ref}
      className={`popover-layer ${className}`}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
        zIndex: 400,
      }}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => { if (e.key === "Escape") onClose(); }}
    >
      {children}
    </div>,
    document.body,
  );
}
