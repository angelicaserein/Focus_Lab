import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Trash2, Star } from "lucide-react";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import { assignMatrixPositions } from "@/utils/ai/aiMatrixAssign";
import { useMatrixDrag } from "@/hooks/task/useMatrixDrag";
import {
  clamp,
  scaleForPriority,
  dimForPriority,
  isPlaced,
  layoutQuadrantGrid,
  quadrantOfPos,
  quadrantBounds,
  confineToQuadrant,
  priorityByFlags,
  priorityCenter,
  PRIORITY_QUADRANTS,
  DIVIDER_X,
  DIVIDER_Y,
  PLANE_X_MIN,
  PLANE_X_MAX,
  PLANE_Y_MIN,
  PLANE_Y_MAX,
} from "@/utils/task/matrixGeometry";
import MatrixSortDialog from "./MatrixSortDialog";
import BrainDumpAssistant from "@/pages/Tasks/BrainDumpAssistant";
import Toast from "@/components/ui/Toast";
import "./EisenhowerMatrix.css";

// 紧急/重要优先级平面（艾森豪威尔矩阵的连续版）：
//   不再是四个硬格子，而是一整块平面——任务可拖到任意位置。
//   横轴＝紧急度（左紧急、右不紧急），纵轴＝重要度（上重要、下不重要）。
//   背景红→蓝热力渐变：越靠左上越「热」（重要且紧急）。
//   落点写入 todo.matrixPos={x,y}（均为 0..1）；拖回底部托盘则清空定位。
//   卡片大小随落点变化：越靠左上越大——拖动时用指针事件驱动，
//   跟随光标的「幽灵卡」会实时缩放，边拖边变大/变小。
//   点击标签＝加入/移出本次专注（与左栏「已选任务」联动）。
//
// 拖拽细节抽到 useMatrixDrag，两步归类弹窗抽到 MatrixSortDialog，几何换算在 matrixGeometry。

// 卡片默认只显示任务名。单击＝在卡片右上方浮出「完成/编辑/删除」扁平小菜单（不撑宽卡片本身，
// 菜单由父组件在矩阵层单独渲染，见 MatrixCardMenu），双击＝直接进入沉浸式专注。
// 托盘里的未分类卡额外常驻「分一下」入口。data-todo-id 供菜单定位到这张卡。
function TaskTag({
  todo, focused, settling, dragging, expanded, editing, editDraft,
  onPointerDown, onToggleExpand, onSort,
  onEditChange, onEditSubmit, onEditCancel, t,
}) {
  return (
    <span
      className={`matrix-tag${focused ? " focused" : ""}${settling ? " settling" : ""}${dragging ? " dragging" : ""}${expanded ? " expanded" : ""}`}
      data-todo-id={todo.id}
      onPointerDown={(e) => onPointerDown(e, todo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleExpand(todo.id);
        }
      }}
      title={todo.text}
    >
      {editing ? (
        <input
          className="matrix-tag-edit"
          value={editDraft}
          autoFocus
          onChange={(e) => onEditChange(e.target.value)}
          // 输入框自己吃掉指针事件，避免触发卡片拖拽 / 点击展开
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onEditSubmit(); }
            else if (e.key === "Escape") { e.preventDefault(); onEditCancel(); }
          }}
          onBlur={onEditSubmit}
          aria-label={t("focus.matrix.editAria", { text: todo.text })}
        />
      ) : (
        <>
          <span className="matrix-tag-text">{todo.text}</span>
          {onSort && (
            <button
              type="button"
              className="matrix-tag-sort"
              onClick={(e) => {
                e.stopPropagation();
                onSort(todo.id);
              }}
              aria-label={t("focus.matrix.sortAria", { text: todo.text })}
            >
              {t("focus.matrix.sortCta")}
            </button>
          )}
        </>
      )}
    </span>
  );
}

// 菜单与卡片之间的缝隙、以及菜单离视口边缘至少留的余量（px）
const MENU_GAP = 7;
const MENU_MARGIN = 8;

// 卡片上方浮出的扁平操作菜单：固定定位（脱离平面的 overflow:hidden 与 3D 倾倒裁剪），
// 锚点是父组件实时算好的卡片矩形（上沿中点 + 下沿）。
// 摆位在这里收尾：菜单先量出自己的尺寸，再决定浮在卡片上方还是（上方放不下时）翻到下方，
// 左右也夹进视口——顶行 / 贴边的卡片不会把菜单顶出屏幕外。
function MatrixCardMenu({
  anchor, todo, focused, autoFocus,
  onToggleFocus, onComplete, onEdit, onDelete, t,
}) {
  const menuRef = useRef(null);
  // 量完才知道往哪摆；未定位前先藏起来，避免闪现在错位置
  const [placement, setPlacement] = useState(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!anchor || !el) { setPlacement(null); return; }
    const { width, height } = el.getBoundingClientRect();
    const above = anchor.top - height - MENU_GAP;
    const flip = above < MENU_MARGIN; // 上方塞不下 → 翻到卡片下方
    setPlacement({
      left: clamp(
        anchor.cx - width / 2,
        MENU_MARGIN,
        Math.max(MENU_MARGIN, window.innerWidth - width - MENU_MARGIN)
      ),
      top: flip ? anchor.bottom + MENU_GAP : above,
      flip,
    });
  }, [anchor]);

  // 键盘展开（Enter/Space）时把焦点送进菜单第一颗按钮——否则 Tab 会跳到下一张卡片，
  // 菜单在 DOM 末尾，键盘根本够不着。每次展开只送一次：滚动时锚点会不断重算，
  // 若不设闸，焦点会被反复拽回第一颗按钮。
  const focusSentRef = useRef(false);
  useEffect(() => {
    if (!anchor) { focusSentRef.current = false; return; }
    if (!autoFocus || !placement || focusSentRef.current) return;
    focusSentRef.current = true;
    menuRef.current?.querySelector("button")?.focus();
  }, [anchor, autoFocus, placement]);

  if (!anchor || !todo) return null;
  return (
    <div
      ref={menuRef}
      className={`matrix-tag-menu${placement?.flip ? " flip" : ""}`}
      role="group"
      aria-label={t("focus.matrix.actionsAria", { text: todo.text })}
      style={{
        left: `${placement?.left ?? 0}px`,
        top: `${placement?.top ?? 0}px`,
        visibility: placement ? undefined : "hidden",
      }}
    >
      <button
        type="button"
        className={`matrix-tag-act focus${focused ? " active" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleFocus(todo.id); }}
        aria-label={t("focus.matrix.focusToggleAria", { text: todo.text })}
        title={focused ? t("focus.matrix.focusRemove") : t("focus.matrix.focusAdd")}
      >
        <Star size={14} strokeWidth={2.4} fill={focused ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="matrix-tag-act complete"
        onClick={(e) => { e.stopPropagation(); onComplete(todo.id); }}
        aria-label={t("focus.matrix.completeAria", { text: todo.text })}
        title={t("focus.matrix.complete")}
      >
        <Check size={15} strokeWidth={2.6} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="matrix-tag-act edit"
        onClick={(e) => { e.stopPropagation(); onEdit(todo.id); }}
        aria-label={t("focus.matrix.editAria", { text: todo.text })}
        title={t("focus.matrix.edit")}
      >
        <Pencil size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="matrix-tag-act del"
        onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
        aria-label={t("focus.matrix.deleteAria", { text: todo.text })}
        title={t("focus.matrix.delete")}
      >
        <Trash2 size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function EisenhowerMatrix({ onStartImmersive }) {
  const {
    todos, addTodo, toggleTodo, editTodo, updateTodoProps, setTodoAttr, deleteTodo,
    pendingDelete, undoDelete,
  } = useTodos();
  const { isFocused, toggleFocusTodo } = useFocus();
  const { t } = useLanguage();

  const [draft, setDraft] = useState("");
  // 「倒脑子」助手：把脑子里乱糟糟的事一股脑写下来，AI 拆成候选任务落到任务库
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [settlingId, setSettlingId] = useState(null);
  // 卡片交互：expandedId=正浮出操作菜单的卡片；menuAnchor=卡片矩形（视口坐标，菜单据此摆位）；
  //   editingId/editDraft=正在改名的卡片与草稿
  const [expandedId, setExpandedId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  // 这次展开是不是键盘触发的：是则把焦点送进菜单，收起时再还给卡片
  const [menuByKeyboard, setMenuByKeyboard] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  // 平面容器 ref（供菜单锚点在有滚动/倾倒时也能定位）
  const containerRef = useRef(null);
  // 各象限为放下全部卡片而施加的整体缩小系数（priorityId → 0..1），网格布局算出，乘到卡片渲染缩放上
  const [quadShrink, setQuadShrink] = useState({});
  // 「分一下」两步问答：sortId=正在归类的任务，sortUrgent=第一题答案（null 表示还在第一步）
  const [sortId, setSortId] = useState(null);
  const [sortUrgent, setSortUrgent] = useState(null);
  // AI 自动分配：aiBusy=正在请求，aiError=上次失败提示
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(false);

  // 轻点分流：单击展开操作条、双击进沉浸式专注。用一个短延时区分——
  //   首次轻点起个定时器，超时未等来第二击＝单击；期间来了同卡第二击＝双击。
  const tapRef = useRef(null); // { id, timer }
  const DOUBLE_TAP_MS = 260;
  const handleCardTap = useCallback((id) => {
    const pending = tapRef.current;
    if (pending && pending.id === id) {
      clearTimeout(pending.timer);
      tapRef.current = null;
      setExpandedId(null);
      setEditingId(null);
      const td = todos.find((t) => t.id === id);
      if (td) onStartImmersive?.(td);
      return;
    }
    if (pending) clearTimeout(pending.timer);
    const timer = setTimeout(() => {
      tapRef.current = null;
      setEditingId(null);
      setMenuByKeyboard(false); // 指针展开：焦点不必搬进菜单
      setExpandedId((cur) => (cur === id ? null : id));
    }, DOUBLE_TAP_MS);
    tapRef.current = { id, timer };
  }, [todos, onStartImmersive]);
  // 卸载时清掉悬空的单击定时器
  useEffect(() => () => { if (tapRef.current) clearTimeout(tapRef.current.timer); }, []);

  // 点到卡片 / 菜单之外＝收起菜单 / 退出改名
  useEffect(() => {
    if (expandedId == null && editingId == null) return;
    const onDown = (e) => {
      if (!e.target.closest(".matrix-tag, .matrix-tag-menu")) {
        setExpandedId(null);
        setEditingId(null);
        setMenuByKeyboard(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [expandedId, editingId]);

  // 菜单锚点：展开卡片的视口矩形（上沿中点 + 下沿），滚动/改窗时实时跟随；
  //   卡片消失（被删/改名收起）则清空。改名态不显示菜单。具体摆哪边由菜单自己收尾。
  useEffect(() => {
    if (expandedId == null || editingId != null) { setMenuAnchor(null); return; }
    const place = () => {
      const el = containerRef.current?.querySelector(`.matrix-tag[data-todo-id="${expandedId}"]`);
      if (!el) { setMenuAnchor(null); return; }
      const r = el.getBoundingClientRect();
      setMenuAnchor((prev) => {
        const next = { cx: r.left + r.width / 2, top: r.top, bottom: r.bottom };
        // 位置没变就保持同一个对象引用，免得滚动时空转重排菜单
        if (prev && prev.cx === next.cx && prev.top === next.top && prev.bottom === next.bottom) {
          return prev;
        }
        return next;
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [expandedId, editingId, quadShrink]);

  // 收起菜单。键盘展开的那次要把焦点还给卡片，否则焦点落在被卸载的按钮上、直接回到页面开头。
  const closeMenu = useCallback(() => {
    setExpandedId((cur) => {
      if (cur != null && menuByKeyboard) {
        containerRef.current
          ?.querySelector(`.matrix-tag[data-todo-id="${cur}"]`)
          ?.focus();
      }
      return null;
    });
    setMenuByKeyboard(false);
  }, [menuByKeyboard]);

  // Esc 收起菜单 / 退出改名——和点空白处同义，是所有浮层的通用退路
  useEffect(() => {
    if (expandedId == null && editingId == null) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      // 改名输入框自己会处理 Esc（撤销这次改名），别越过它把菜单一起关了
      if (editingId != null) return;
      e.stopPropagation();
      closeMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expandedId, editingId, closeMenu]);

  // 操作条三个动作：完成打勾、改名、删除。动作后收起操作条。
  const completeTask = (id) => { toggleTodo(id); setExpandedId(null); };
  const startEdit = (id) => {
    const td = todos.find((t) => t.id === id);
    setEditDraft(td?.text ?? "");
    setEditingId(id);
  };
  const submitEdit = () => {
    if (editingId != null) editTodo(editingId, editDraft);
    setEditingId(null);
    setExpandedId(null);
  };
  const cancelEdit = () => setEditingId(null);
  const removeTask = (id) => { deleteTodo(id); setExpandedId(null); };
  // 键盘（Enter/Space）展开：标记这次是键盘触发，好让焦点进得去、也回得来
  const toggleExpand = (id) => {
    setEditingId(null);
    setExpandedId((cur) => {
      const next = cur === id ? null : id;
      setMenuByKeyboard(next != null);
      return next;
    });
  };

  // 拖拽：落在平面写落点并触发落座动画，拖回托盘清定位，轻点则展开/进专注（handleCardTap）
  const { drag, planeRef, trayRef, handlePointerDown } = useMatrixDrag({
    onPlace: (id, pos) => {
      // 落点归入所在象限：夹进该象限内（不跨中线），并把优先级标签改成对应象限——
      // 拖动即重新定级，标签永远和落点一致。防重叠松弛在 useLayoutEffect 收尾。
      const priority = quadrantOfPos(pos);
      updateTodoProps(id, { matrixPos: confineToQuadrant(pos, priority) });
      setTodoAttr(id, "priority", priority);
      setSettlingId(id);
    },
    // 拖回托盘＝重新变「未分类」：连优先级标签一起清空。否则「自动归位」会立刻把它
    // 弹回象限，托盘就永远留不住带标签的卡片了。标签与落点是同一个真相，一起进退。
    onTray: (id) => {
      updateTodoProps(id, { matrixPos: undefined });
      setTodoAttr(id, "priority", null);
    },
    onActivate: handleCardTap,
  });

  // 未完成任务：有合法坐标者摆在平面上，其余进入底部「未分类」托盘
  const { placed, unplaced } = useMemo(() => {
    const placed = [];
    const unplaced = [];
    for (const todo of todos) {
      if (todo.completed) continue;
      (isPlaced(todo) ? placed : unplaced).push(todo);
    }
    return { placed, unplaced };
  }, [todos]);

  // 标签 ↔ 落点对账（每次 todos 变化各卡片各写一次，改动才写，写完即收敛）：
  //   ① 已落位的卡片：把优先级标签对齐到落点所在象限，并把落点夹进该象限（清掉旧数据
  //      里跨中线 / 标签与落点不符的历史遗留）。落点是它的真相。
  //   ② 未落位但有优先级标签的卡片（多半是在任务库里定的级）：自动摆进对应象限中心。
  //      标签是它的真相——这就是「自动归位」。
  useEffect(() => {
    for (const td of todos) {
      if (td.completed) continue;
      if (isPlaced(td)) {
        const priority = quadrantOfPos(td.matrixPos);
        if (td.attrs?.priority !== priority) setTodoAttr(td.id, "priority", priority);
        const c = confineToQuadrant(td.matrixPos, priority);
        if (Math.abs(c.x - td.matrixPos.x) > 0.003 || Math.abs(c.y - td.matrixPos.y) > 0.003) {
          updateTodoProps(td.id, { matrixPos: c });
        }
      } else if (td.attrs?.priority && td.attrs.priority in PRIORITY_QUADRANTS) {
        const c = priorityCenter(td.attrs.priority);
        const jitter = () => (Math.random() - 0.5) * 0.12;
        updateTodoProps(td.id, {
          matrixPos: confineToQuadrant({ x: c.x + jitter(), y: c.y + jitter() }, td.attrs.priority),
        });
      }
    }
  }, [todos, updateTodoProps, setTodoAttr]);

  // 统一「整齐吸附」：任何摆放变化（拖拽 / 分一下 / AI 分配）后，按象限把卡片流式排成整齐网格，
  //   把结果回写为落点。三条路径共用这一处收尾。
  //   槽位按「该象限最大缩放」量（offsetWidth×maxScale），渲染各卡片仍按自身落点缩放（≤ 槽位），
  //   于是大小渐变照旧、且卡片永远待在槽位内——数学上不可能重叠。象限装不下时整体等比缩小。
  //   尺寸用 offsetWidth、位置直接算——不走 getBoundingClientRect，故不受平面 3D 倾倒（天平）影响。
  useLayoutEffect(() => {
    const plane = planeRef.current;
    if (!plane || placed.length === 0) return;
    const planeW = plane.clientWidth;
    const planeH = plane.clientHeight;
    if (!planeW || !planeH) return;

    // 按象限分组（象限由标签定，标签已与落点同步；退回按落点算）
    const groups = new Map();
    for (const td of placed) {
      const node = plane.querySelector(`[data-todo-id="${td.id}"]`);
      if (!node) continue;
      const priority = td.attrs?.priority ?? quadrantOfPos(td.matrixPos);
      if (!groups.has(priority)) groups.set(priority, []);
      groups.get(priority).push({ td, node });
    }

    const nextShrink = {};
    const writes = [];
    for (const [priority, list] of groups) {
      const b = quadrantBounds(priority);
      // 同象限一个大小：以该象限档位缩放量槽位，卡片渲染时正好等于槽位（不会超）
      const maxScale = scaleForPriority(priority);
      // 期望顺序：按当前落点从上到下、从左到右——拖得越靠上/左，排得越靠前
      list.sort(
        (a, z) =>
          a.td.matrixPos.y - z.td.matrixPos.y || a.td.matrixPos.x - z.td.matrixPos.x
      );
      const cards = list.map(({ td, node }) => ({
        id: td.id,
        w: node.offsetWidth * maxScale,
        h: node.offsetHeight * maxScale,
      }));
      const bounds = {
        minX: b.xMin * planeW,
        maxX: b.xMax * planeW,
        minY: b.yMin * planeH,
        maxY: b.yMax * planeH,
      };
      const { positions, shrink } = layoutQuadrantGrid(cards, bounds);
      nextShrink[priority] = shrink;
      for (const p of positions) {
        writes.push({
          id: p.id,
          x: clamp(p.cx / planeW, PLANE_X_MIN, PLANE_X_MAX),
          y: clamp(p.cy / planeH, PLANE_Y_MIN, PLANE_Y_MAX),
        });
      }
    }

    // 只回写真正挪动过的卡片，避免无谓重渲染 / 存储写入，并让 effect 收敛
    const byId = new Map(placed.map((td) => [td.id, td]));
    for (const w of writes) {
      const td = byId.get(w.id);
      if (
        Math.abs(td.matrixPos.x - w.x) > 0.003 ||
        Math.abs(td.matrixPos.y - w.y) > 0.003
      ) {
        updateTodoProps(w.id, { matrixPos: { x: w.x, y: w.y } });
      }
    }
    // 缩小系数有变才更新（否则维持引用，避免重渲染循环）
    setQuadShrink((prev) => {
      const keys = new Set([...Object.keys(prev), ...Object.keys(nextShrink)]);
      for (const k of keys) {
        if (Math.abs((prev[k] ?? 1) - (nextShrink[k] ?? 1)) > 0.005) return nextShrink;
      }
      return prev;
    });
  }, [placed, updateTodoProps, planeRef]);

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addTodo(text);
    setDraft("");
  };

  // 「分一下」两步问答
  const startSort = (id) => {
    setSortId(id);
    setSortUrgent(null);
  };
  const cancelSort = () => {
    setSortId(null);
    setSortUrgent(null);
  };
  // 第一步记下紧急度答案；第二步作答后收尾落位
  const answerSort = (value) => {
    if (sortUrgent === null) setSortUrgent(value);
    else finishSort(value);
  };
  // 把紧急/重要两答案换算成象限：落到象限中心（加轻微抖动错开起点），并同步优先级标签。
  //   左＝紧急、上＝重要；防重叠松弛（useLayoutEffect）负责最终不重叠、不跨区。
  const finishSort = (important) => {
    if (!sortId) return;
    const priority = priorityByFlags(sortUrgent, important);
    const c = priorityCenter(priority);
    const jitter = () => (Math.random() - 0.5) * 0.12;
    updateTodoProps(sortId, {
      matrixPos: confineToQuadrant({ x: c.x + jitter(), y: c.y + jitter() }, priority),
    });
    setTodoAttr(sortId, "priority", priority);
    setSettlingId(sortId);
    setSortId(null);
    setSortUrgent(null);
  };

  // AI 自动分配：把托盘里的未分类任务一次性交给模型估紧急/重要度，
  //   换算成落点写入 matrixPos。urgency→x（越紧急越靠左）、importance→y（越重要越靠上）。
  //   加轻微抖动，避免同分任务完全重叠；失败/无结果给一句温柔提示。
  const autoAssign = async () => {
    if (aiBusy || unplaced.length === 0) return;
    setAiBusy(true);
    setAiError(false);
    try {
      const tasks = unplaced.map((td) => ({ id: td.id, text: td.text, attrs: td.attrs }));
      const { positions } = await assignMatrixPositions(tasks);
      let applied = 0;
      const jitter = () => (Math.random() - 0.5) * 0.06;
      for (const td of unplaced) {
        const p = positions[td.id];
        if (!p) continue;
        const x = clamp(1 - p.urgency + jitter(), PLANE_X_MIN, PLANE_X_MAX);
        const y = clamp(1 - p.importance + jitter(), PLANE_Y_MIN, PLANE_Y_MAX);
        const priority = quadrantOfPos({ x, y });
        updateTodoProps(td.id, { matrixPos: confineToQuadrant({ x, y }, priority) });
        setTodoAttr(td.id, "priority", priority);
        applied++;
      }
      if (applied === 0) {
        // 调用成功但一条落点都没算出来：多半是模型返回被截断/解析为空
        console.warn("[matrixAssign] 空结果：模型未返回可用落点", { asked: unplaced.length, positions });
        setAiError(true);
      }
    } catch (e) {
      // API 调用本身抛错（网络/鉴权/模型报错）
      console.error("[matrixAssign] 调用失败", e);
      setAiError(true);
    } finally {
      setAiBusy(false);
    }
  };

  const sortTodo = sortId ? todos.find((td) => td.id === sortId) : null;

  const renderTag = (todo, sortable = false) => (
    <TaskTag
      key={todo.id}
      todo={todo}
      focused={isFocused(todo.id)}
      settling={settlingId === todo.id}
      dragging={drag?.id === todo.id}
      expanded={expandedId === todo.id}
      editing={editingId === todo.id}
      editDraft={editDraft}
      onPointerDown={handlePointerDown}
      onToggleExpand={toggleExpand}
      onSort={sortable ? startSort : undefined}
      onEditChange={setEditDraft}
      onEditSubmit={submitEdit}
      onEditCancel={cancelEdit}
      t={t}
    />
  );

  const expandedTodo = expandedId != null ? todos.find((td) => td.id === expandedId) : null;

  const overPlane = drag?.zone === "plane";
  const overTray = drag?.zone === "tray";

  // 天平：整块平面架在正中的支点上，按卡片「加权重心」偏移向重的一侧倾倒。
  //   质量＝卡片大小（越靠左上越重）；重心越偏离中心，倾角越大。
  //   正在拖动的卡片也计入，于是拖动时板子实时跟着倒。
  const tilt = useMemo(() => {
    let mass = 0;
    let sx = 0;
    let sy = 0;
    const add = (x, y, m) => {
      mass += m;
      sx += m * x;
      sy += m * y;
    };
    for (const td of placed) {
      const priority = td.attrs?.priority ?? quadrantOfPos(td.matrixPos);
      add(td.matrixPos.x, td.matrixPos.y, scaleForPriority(priority));
    }
    if (drag && drag.zone === "plane") add(drag.fx, drag.fy, drag.scale);
    if (mass === 0) return { rx: 0, ry: 0 };
    const cx = sx / mass - 0.5; // 重心相对中心的水平偏移 (-0.5..0.5)
    const cy = sy / mass - 0.5; // 垂直偏移
    const GAIN = 13; // 每单位偏移对应的倾角（度）
    const cap = (v) => Math.max(-6, Math.min(6, v));
    // 载荷偏下 → 下沿沉；偏右 → 右沿沉（放哪边哪边压下去）
    return { rx: cap(-cy * GAIN), ry: cap(cx * GAIN) };
  }, [placed, drag]);

  return (
    <div ref={containerRef} className="matrix-container" aria-label={t("focus.matrix.title")}>
      <div className="matrix-header">
        <span className="matrix-title">
          {t("focus.matrix.title")}
          {/* 信息提示（help icon）：悬停/聚焦时说明整张热力图的含义 */}
          <span className="matrix-info">
            <button
              type="button"
              className="matrix-info-btn"
              aria-label={t("focus.matrix.infoAria")}
            >
              ?
            </button>
            <span className="matrix-info-tip" role="tooltip">
              {t("focus.matrix.info")}
            </span>
          </span>
        </span>
        <span className="matrix-hint">{t("focus.matrix.hint")}</span>
      </div>

      <form className="matrix-form" onSubmit={submit}>
        <input
          className="matrix-input"
          placeholder={t("focus.matrix.addPlaceholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={t("focus.matrix.addPlaceholder")}
        />
        <button
          type="button"
          className="matrix-braindump"
          onClick={() => setShowBrainDump(true)}
          title={t("focus.matrix.brainDump")}
        >
          🧠 {t("focus.matrix.brainDump")}
        </button>
        <button type="submit" className="matrix-add">
          {t("focus.matrix.add")}
        </button>
      </form>

      {showBrainDump && (
        <BrainDumpAssistant onClose={() => setShowBrainDump(false)} onAdded={() => {}} />
      )}

      <div className="matrix-board">
        <div
          ref={planeRef}
          className={`matrix-plane${overPlane ? " drag-over" : ""}`}
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            // 十字分界线位置：与几何 DIVIDER_X/Y 同源，竖线偏右、横线偏下
            "--divider-x": `${DIVIDER_X * 100}%`,
            "--divider-y": `${DIVIDER_Y * 100}%`,
          }}
        >
          {placed.length === 0 && (
            <span className="matrix-plane-empty">{t("focus.matrix.dropHere")}</span>
          )}

          {placed.map((todo) => {
            // 卡片大小/明度只看象限档位：越重要越大越亮，同象限一个大小
            const priority = todo.attrs?.priority ?? quadrantOfPos(todo.matrixPos);
            const weight = (1 - todo.matrixPos.x) * 0.5 + (1 - todo.matrixPos.y) * 0.5;
            // 网格布局给该象限的整体缩小系数（象限装不下时 <1），乘到档位缩放上——渲染仍 ≤ 槽位，不重叠
            const scale = scaleForPriority(priority) * (quadShrink[priority] ?? 1);
            return (
              <div
                key={todo.id}
                className="matrix-node"
                data-todo-id={todo.id}
                style={{
                  left: `${todo.matrixPos.x * 100}%`,
                  top: `${todo.matrixPos.y * 100}%`,
                  "--matrix-scale": scale.toFixed(3),
                  "--matrix-dim": dimForPriority(priority),
                  zIndex: Math.round(weight * 100) + 1,
                }}
                onAnimationEnd={() =>
                  setSettlingId((s) => (s === todo.id ? null : s))
                }
              >
                {renderTag(todo)}
              </div>
            );
          })}
        </div>
      </div>

      {/* 未分类托盘：新建任务先落这里，拖入平面完成摆放 */}
      <div
        ref={trayRef}
        className={`matrix-tray${overTray ? " drag-over" : ""}`}
      >
        <div className="matrix-tray-head">
          <span className="matrix-tray-label">{t("focus.matrix.unclassified")}</span>
          {unplaced.length > 0 && (
            <button
              type="button"
              className="matrix-ai-assign"
              onClick={autoAssign}
              disabled={aiBusy}
              aria-label={t("focus.matrix.aiAssignAria")}
            >
              <span className="matrix-ai-assign-icon" aria-hidden="true">✨</span>
              {aiBusy ? t("focus.matrix.aiAssigning") : t("focus.matrix.aiAssign")}
            </button>
          )}
        </div>
        {aiError && (
          <span className="matrix-ai-error" role="status">
            {t("focus.matrix.aiAssignError")}
          </span>
        )}
        <div className="matrix-tray-tags">
          {unplaced.length > 0 ? (
            unplaced.map((todo) => renderTag(todo, true))
          ) : (
            <span className="matrix-cell-empty">{t("focus.matrix.trayEmpty")}</span>
          )}
        </div>
      </div>

      {/* 跟随光标的「幽灵卡」：实时缩放，越靠左上越大 */}
      {drag && (
        <div
          className="matrix-drag-ghost"
          style={{
            left: `${drag.x}px`,
            top: `${drag.y}px`,
            transform: `translate(-50%, -50%) scale(${drag.scale})`,
          }}
          aria-hidden="true"
        >
          <span className={`matrix-tag${isFocused(drag.id) ? " focused" : ""}`}>
            <span className="matrix-tag-text">{drag.text}</span>
          </span>
        </div>
      )}

      {/* 单击卡片浮出的扁平操作菜单：浮在卡片上方居中，固定定位不撑宽卡片 */}
      <MatrixCardMenu
        anchor={menuAnchor}
        todo={expandedTodo}
        autoFocus={menuByKeyboard}
        focused={expandedTodo ? isFocused(expandedTodo.id) : false}
        onToggleFocus={toggleFocusTodo}
        onComplete={completeTask}
        onEdit={startEdit}
        onDelete={removeTask}
        t={t}
      />

      {/* 删除的撤销条：deleteTodo 本来就留了 5 秒撤销窗（useUndoDelete），
          但这条一直只在任务库页渲染——专注页上删卡片等于直接没了。补上。 */}
      <Toast
        pendingDelete={pendingDelete}
        undoDelete={undoDelete}
        getText={(item) => item.text}
      />

      {/* 两步是非题：把「感觉放哪」拆成两个封闭问题，自动落到象限 */}
      {sortTodo && (
        <MatrixSortDialog
          todo={sortTodo}
          urgent={sortUrgent}
          onAnswer={answerSort}
          onBack={() => setSortUrgent(null)}
          onCancel={cancelSort}
          t={t}
        />
      )}
    </div>
  );
}
