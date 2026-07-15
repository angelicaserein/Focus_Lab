import { useRef, useState } from "react";
import {
  clamp,
  scaleFor,
  DRAG_THRESHOLD,
  PLANE_X_MIN,
  PLANE_X_MAX,
  PLANE_Y_MIN,
  PLANE_Y_MAX,
} from "@/utils/task/matrixGeometry";

// 艾森豪威尔平面的指针拖拽：把卡片拖到平面任意位置（写落点）或拖回托盘（清定位），
// 没怎么动则视作点击。所有过程数据放 dragRef，避免 pointermove 读到过期闭包。
//
// 回调：
//   onPlace(id, { x, y })  落在平面 → 写入 matrixPos（x/y 均 0..1）
//   onTray(id)             拖回托盘 → 清空定位
//   onActivate(id)         轻点（位移小于阈值）→ 加入/移出本次专注
//
// 返回 { drag, planeRef, trayRef, handlePointerDown }：
//   drag 为跟随光标的「幽灵卡」状态，null 表示未在拖动。
export function useMatrixDrag({ onPlace, onTray, onActivate }) {
  // 正在拖动的「幽灵卡」状态：{ id, text, x, y, scale, zone, fx, fy }（x/y 为视口坐标）
  const [drag, setDrag] = useState(null);
  const planeRef = useRef(null);
  const trayRef = useRef(null);
  // 拖动过程数据放 ref，避免 pointermove 里读到过期闭包
  const dragRef = useRef(null);

  // 命中测试：光标落在平面 / 托盘 / 别处，并给出平面上的 0..1 坐标
  const resolveZone = (clientX, clientY) => {
    const inside = (r) =>
      r && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    const planeRect = planeRef.current?.getBoundingClientRect();
    if (inside(planeRect)) {
      const x = clamp((clientX - planeRect.left) / planeRect.width, PLANE_X_MIN, PLANE_X_MAX);
      const y = clamp((clientY - planeRect.top) / planeRect.height, PLANE_Y_MIN, PLANE_Y_MAX);
      return { zone: "plane", x, y };
    }
    const trayRect = trayRef.current?.getBoundingClientRect();
    if (inside(trayRect)) return { zone: "tray", x: 0, y: 0 };
    return { zone: null, x: 0, y: 0 };
  };

  const stopDragListeners = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleCancel);
  };

  function handleMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
      d.moved = true;
    }
    // 保持抓取偏移：卡片跟着「被抓的那一点」走，不会瞬间跳到光标中心
    const cardX = e.clientX - d.offsetX;
    const cardY = e.clientY - d.offsetY;
    const { zone, x, y } = resolveZone(cardX, cardY);
    // 平面内按落点实时缩放；托盘/别处给个统一的小尺寸
    const scale = zone === "plane" ? scaleFor(x, y) : 0.9;
    d.zone = zone;
    setDrag({ id: d.id, text: d.text, x: cardX, y: cardY, scale, zone, fx: x, fy: y });
  }

  function handleUp(e) {
    stopDragListeners();
    const d = dragRef.current;
    if (!d) {
      setDrag(null);
      return;
    }
    if (!d.moved) {
      // 没怎么动 → 当作点击：加入/移出本次专注
      dragRef.current = null;
      onActivate(d.id);
      setDrag(null);
      return;
    }
    const cardX = e.clientX - d.offsetX;
    const cardY = e.clientY - d.offsetY;
    const { zone, x, y } = resolveZone(cardX, cardY);
    if (zone === "plane") {
      // 落点交给组件：象限死区吸附 + 统一防重叠松弛在那边收尾
      onPlace(d.id, { x, y });
    } else if (zone === "tray") {
      onTray(d.id);
    }
    // 落在别处：不改动，卡片回到原位
    dragRef.current = null;
    setDrag(null);
  }

  function handleCancel() {
    stopDragListeners();
    dragRef.current = null;
    setDrag(null);
  }

  const handlePointerDown = (e, todo) => {
    // 只响应主键（左键/触摸/笔），且不抢删除/分一下按钮的点击
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest("button")) return;
    e.preventDefault(); // 避免拖动时选中文字
    // 记下光标相对卡片中心的偏移，拖动时保持这一抓取点
    const r = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id: todo.id,
      text: todo.text,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - (r.left + r.width / 2),
      offsetY: e.clientY - (r.top + r.height / 2),
      moved: false,
      zone: null,
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
  };

  return { drag, planeRef, trayRef, handlePointerDown };
}
