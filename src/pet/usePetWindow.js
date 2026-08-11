import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import desktop from "@/utils/desktop/desktopBridge";

// 桌宠窗的「窗口行为」：拖动、点击穿透、展开收起。
// 单独拎出来是因为这三件事互相纠缠（拖动期间不能判定点击、也不能开启穿透），
// 混在 PetApp 的 JSX 里会很难读。UI 只需要拿到 expanded + 一组 handler。

const CLICK_SLOP = 4; // 按下到抬起的位移小于这个像素数，算一次点击而非拖动

// 窗口尺寸是固定的（见 main.cjs 的 PET_SIZE）：展开只是把面板画出来，
// 不再让主进程改窗口大小。透明窗每次 setBounds 都会闪一下，那一下比省下来的
// 那点屏幕面积贵得多；空着的上半截反正是透明且穿透的，不占地方。
export default function usePetWindow() {
  const [expanded, setExpanded] = useState(false);
  const draggingRef = useRef(false);

  // ── 点击穿透 ──
  // 桌宠窗是个矩形，但画面里只有烧瓶那一小块是实体。光标不在实体上时让整个窗口
  // 对鼠标透明，否则这块看不见的矩形会挡住底下的桌面图标。
  // 「是否落在实体上」交给 CSS：只有 [data-pet-hit] 里真正接管鼠标的图形
  // （烧瓶轮廓、面板）才会被 elementFromPoint 命中，见 PetApp.css。
  //
  // 主进程用 setIgnoreMouseEvents(ignore, { forward: true }) —— forward 保证
  // 穿透状态下渲染层仍能收到 mousemove，不然一旦穿透就永远回不来了。
  const ignoreRef = useRef(null);
  const setIgnore = useCallback((ignore) => {
    if (ignoreRef.current === ignore) return; // IPC 去重：mousemove 很密
    ignoreRef.current = ignore;
    desktop.setIgnoreMouse(ignore);
  }, []);

  // 最后一次光标位置。展开/收起会让面板出现或消失，光标底下的东西随之改变，
  // 但这期间未必有 mousemove，得拿它主动复算一次。
  const lastPointRef = useRef(null);

  const hitTest = useCallback((x, y) => {
    const el = document.elementFromPoint(x, y);
    return !!el?.closest?.("[data-pet-hit]");
  }, []);

  const recheck = useCallback(() => {
    if (draggingRef.current) return;
    const pt = lastPointRef.current;
    if (!pt) return;
    setIgnore(!hitTest(pt.x, pt.y));
  }, [hitTest, setIgnore]);

  const applyExpanded = useCallback((next) => {
    setExpanded(next);
    // 面板要等画出来才改变命中区域，所以下一帧再判定光标落在哪
    requestAnimationFrame(recheck);
  }, [recheck]);

  useEffect(() => {
    setIgnore(true); // 初始默认穿透，等光标真的移到烧瓶上再关掉

    // 命中判定要走一次 elementFromPoint（强制一次布局），而光标扫过窗口时
    // mousemove 是一路密集地来的。按帧合并：一帧最多判一次，手感完全一样。
    let moveRaf = 0;
    const flushHit = () => {
      moveRaf = 0;
      const pt = lastPointRef.current;
      if (!pt || draggingRef.current) return;
      setIgnore(!hitTest(pt.x, pt.y));
    };
    const onMove = (e) => {
      lastPointRef.current = { x: e.clientX, y: e.clientY };
      if (draggingRef.current) return; // 拖动中绝不能穿透，否则窗口会从手里掉下去
      if (!moveRaf) moveRaf = requestAnimationFrame(flushHit);
    };
    // 光标移出窗口要恢复穿透。mouseleave 在「快速划出」时并不可靠，
    // 补一个 relatedTarget 为空的 mouseout（离开文档时才是空）兜底。
    const onLeave = () => {
      lastPointRef.current = null;
      if (moveRaf) { cancelAnimationFrame(moveRaf); moveRaf = 0; }
      if (!draggingRef.current) setIgnore(true);
    };
    const onOut = (e) => { if (!e.relatedTarget) onLeave(); };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", recheck);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseout", onOut);
    return () => {
      if (moveRaf) cancelAnimationFrame(moveRaf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", recheck);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseout", onOut);
    };
  }, [hitTest, recheck, setIgnore]);

  // ── 拖动 + 点击 ──
  // 不用 CSS 的 -webkit-app-region: drag：那样系统会吞掉鼠标事件，
  // 同一块区域就没法既能拖又能点。这里自己报告光标的屏幕坐标给主进程算窗口位置，
  // 抬起时按位移大小决定这是一次拖动还是一次点击。
  const dragStateRef = useRef(null);
  // 拖动中每个 mousemove 都发一条 IPC 会让窗口跟手很黏，按帧合并成一条。
  const pendingMoveRef = useRef(null);
  const rafRef = useRef(0);

  const flushMove = useCallback(() => {
    rafRef.current = 0;
    const pt = pendingMoveRef.current;
    pendingMoveRef.current = null;
    if (pt && dragStateRef.current) desktop.dragMove(pt);
  }, []);

  // 拖动收尾只有一条路径：pointerup、pointercancel、丢失捕获都走这里，
  // 漏掉任何一条都会让 draggingRef 永远卡在 true —— 那之后窗口再也不穿透，
  // 桌面上就多了一块看不见的、点不动的矩形。
  const endDrag = useCallback((e) => {
    const st = dragStateRef.current;
    dragStateRef.current = null;
    pendingMoveRef.current = null;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    if (!st) return null;
    draggingRef.current = false;
    try { e?.currentTarget?.releasePointerCapture?.(e.pointerId); } catch { /* 已经释放了 */ }
    desktop.dragEnd();
    return st;
  }, []);

  const onPetPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStateRef.current = { x0: e.screenX, y0: e.screenY, moved: false };
    draggingRef.current = true;
    desktop.dragStart({ x: e.screenX, y: e.screenY });
  }, []);

  const onPetPointerMove = useCallback((e) => {
    const st = dragStateRef.current;
    if (!st) return;
    if (!st.moved && Math.hypot(e.screenX - st.x0, e.screenY - st.y0) > CLICK_SLOP) {
      st.moved = true;
    }
    if (!st.moved) return;
    pendingMoveRef.current = { x: e.screenX, y: e.screenY };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flushMove);
  }, [flushMove]);

  const onPetPointerUp = useCallback((e) => {
    const st = endDrag(e);
    if (st && !st.moved) applyExpanded(!expanded);
  }, [endDrag, expanded, applyExpanded]);

  // 拖动被系统打断（切窗口、锁屏、触控板手势冲突）时只有这两个事件会来
  const onPetPointerCancel = useCallback((e) => { endDrag(e); recheck(); }, [endDrag, recheck]);

  // handler 对象要保持同一个引用：它整包传给 memo 过的烧瓶组件，
  // 每次渲染新建一个对象的话那层 memo 就永远命中不了。
  const petHandlers = useMemo(() => ({
    onPointerDown: onPetPointerDown,
    onPointerMove: onPetPointerMove,
    onPointerUp: onPetPointerUp,
    onPointerCancel: onPetPointerCancel,
    onLostPointerCapture: onPetPointerCancel,
  }), [onPetPointerDown, onPetPointerMove, onPetPointerUp, onPetPointerCancel]);

  return { expanded, setExpanded: applyExpanded, petHandlers };
}
