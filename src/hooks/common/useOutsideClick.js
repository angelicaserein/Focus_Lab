import { useEffect, useRef } from "react";

// 当鼠标点击 ref 元素之外时调用 handler。
// enabled 为 false 时不挂载监听器（节省开销）。
// handler 通过 ref 稳定传递，调用方无需 useCallback 包裹。
export default function useOutsideClick(ref, handler, enabled = true) {
  const savedHandler = useRef(handler);
  useEffect(() => { savedHandler.current = handler; });

  useEffect(() => {
    if (!enabled) return;
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        savedHandler.current(e);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, enabled]);
}
