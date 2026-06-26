import { useCallback, useEffect, useRef, useState } from "react";

// 通用拖动 hook —— 为「手感」而生：
//   · 拖动时直接改 DOM 的 transform（imperative），不触发 React 重渲染 → 不掉帧。
//   · 用 setPointerCapture，指针移出元素/卡片也能持续跟手。
//   · 偏移累加保存在 ref 里，多次拖动可接力。
// 用法：把 nodeRef 挂在「要移动的元素」上，把 onPointerDown 挂在「拖动把手」上。
export default function useDraggable() {
  const nodeRef = useRef(null); // 被移动的元素
  const offsetRef = useRef({ x: 0, y: 0 }); // 已累计偏移
  const startRef = useRef(null); // 本次拖动的指针起点（已减去累计偏移）
  const frameRef = useRef(0);
  const [position, setPosition] = useState({ x: 0, y: 0 }); // 松手后快照，供调试读取

  const apply = useCallback(() => {
    const node = nodeRef.current;
    if (node) {
      const { x, y } = offsetRef.current;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }, []);

  const handleMove = useCallback(
    (e) => {
      const start = startRef.current;
      if (!start) return;
      offsetRef.current = { x: e.clientX - start.x, y: e.clientY - start.y };
      // rAF 节流：每帧最多写一次 transform
      if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = 0;
          apply();
        });
      }
    },
    [apply],
  );

  const endDrag = useCallback(() => {
    startRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setPosition({ ...offsetRef.current }); // 松手时记录最终偏移
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button != null && e.button !== 0) return; // 只响应主键/触摸
      startRef.current = {
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      };
      // 把后续指针事件锁到把手上，移出元素也能继续收到
      e.currentTarget.setPointerCapture?.(e.pointerId);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    [],
  );

  // 把手只需绑这三个；用 pointer capture 后事件都从把手派发
  const handlers = {
    onPointerDown,
    onPointerMove: handleMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return { nodeRef, handlers, position };
}
