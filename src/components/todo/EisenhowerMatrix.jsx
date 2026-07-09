import React, { useMemo, useState, useRef } from "react";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import "./EisenhowerMatrix.css";

// 紧急/重要优先级平面（艾森豪威尔矩阵的连续版）：
//   不再是四个硬格子，而是一整块平面——任务可拖到任意位置。
//   横轴＝紧急度（左紧急、右不紧急），纵轴＝重要度（上重要、下不重要）。
//   背景红→蓝热力渐变：越靠左上越「热」（重要且紧急）。
//   落点写入 todo.matrixPos={x,y}（均为 0..1）；拖回底部托盘则清空定位。
//   卡片大小随落点变化：越靠左上越大——拖动时用指针事件驱动，
//   跟随光标的「幽灵卡」会实时缩放，边拖边变大/变小。
//   点击标签＝加入/移出本次专注（与左栏「已选任务」联动）。

// 四角象限暗示文字（沿用原 q1..q4 文案，仅作方位提示，不再是可落区）
const CORNERS = [
  { id: "q1", pos: "tl" }, // 左上：重要 + 紧急
  { id: "q2", pos: "tr" }, // 右上：重要 + 不紧急
  { id: "q3", pos: "bl" }, // 左下：不重要 + 紧急
  { id: "q4", pos: "br" }, // 右下：不重要 + 不紧急
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 落点 → 缩放：越靠左上（x、y 都小）越大。0.72（右下）→ 1.5（左上），对比更明显
const scaleFor = (x, y) => 0.72 + ((1 - x) * 0.5 + (1 - y) * 0.5) * 0.78;

// 拖动开始的位移阈值（px）：小于此值视作「点击」而非「拖动」
const DRAG_THRESHOLD = 5;

const isPlaced = (todo) =>
  !!todo.matrixPos &&
  typeof todo.matrixPos.x === "number" &&
  typeof todo.matrixPos.y === "number";

function TaskTag({ todo, focused, settling, dragging, onActivate, onDelete, onPointerDown, onSort, sortCta, sortAria, deleteAria }) {
  return (
    <span
      className={`matrix-tag${focused ? " focused" : ""}${settling ? " settling" : ""}${dragging ? " dragging" : ""}`}
      onPointerDown={(e) => onPointerDown(e, todo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(todo.id);
        }
      }}
      title={todo.text}
    >
      <span className="matrix-tag-text">{todo.text}</span>
      {onSort && (
        <button
          type="button"
          className="matrix-tag-sort"
          onClick={(e) => {
            e.stopPropagation();
            onSort(todo.id);
          }}
          aria-label={sortAria}
        >
          {sortCta}
        </button>
      )}
      <button
        type="button"
        className="matrix-tag-del"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
        aria-label={deleteAria}
      >
        ×
      </button>
    </span>
  );
}

export default function EisenhowerMatrix() {
  const { todos, addTodo, updateTodoProps, deleteTodo } = useTodos();
  const { isFocused, toggleFocusTodo } = useFocus();
  const { t } = useLanguage();

  const [draft, setDraft] = useState("");
  // 正在拖动的「幽灵卡」状态：{ id, text, x, y, scale, zone }（x/y 为视口坐标）
  const [drag, setDrag] = useState(null);
  const [settlingId, setSettlingId] = useState(null);
  // 「分一下」两步问答：sortId=正在归类的任务，sortUrgent=第一题答案（null 表示还在第一步）
  const [sortId, setSortId] = useState(null);
  const [sortUrgent, setSortUrgent] = useState(null);
  const planeRef = useRef(null);
  const trayRef = useRef(null);
  // 拖动过程数据放 ref，避免 pointermove 里读到过期闭包
  const dragRef = useRef(null);

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

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addTodo(text);
    setDraft("");
  };

  // 命中测试：光标落在平面 / 托盘 / 别处，并给出平面上的 0..1 坐标
  const resolveZone = (clientX, clientY) => {
    const inside = (r) =>
      r && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    const planeRect = planeRef.current?.getBoundingClientRect();
    if (inside(planeRect)) {
      const x = clamp((clientX - planeRect.left) / planeRect.width, 0.045, 0.955);
      const y = clamp((clientY - planeRect.top) / planeRect.height, 0.06, 0.94);
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
    const { zone, x, y } = resolveZone(e.clientX, e.clientY);
    // 平面内按落点实时缩放；托盘/别处给个统一的小尺寸
    const scale = zone === "plane" ? scaleFor(x, y) : 0.9;
    d.zone = zone;
    setDrag({ id: d.id, text: d.text, x: e.clientX, y: e.clientY, scale, zone });
  }

  function handleUp(e) {
    stopDragListeners();
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) {
      // 没怎么动 → 当作点击：加入/移出本次专注
      toggleFocusTodo(d.id);
      setDrag(null);
      return;
    }
    const { zone, x, y } = resolveZone(e.clientX, e.clientY);
    if (zone === "plane") {
      updateTodoProps(d.id, { matrixPos: { x, y } });
      setSettlingId(d.id);
    } else if (zone === "tray") {
      updateTodoProps(d.id, { matrixPos: undefined });
    }
    // 落在别处：不改动，卡片回到原位
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
    dragRef.current = {
      id: todo.id,
      text: todo.text,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      zone: null,
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
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
  // 第二题作答后，把紧急/重要两答案换算成象限坐标并落位
  //   横轴：左＝紧急(0.27)、右＝不紧急(0.73)；纵轴：上＝重要(0.27)、下＝不重要(0.73)
  //   加轻微抖动，避免同象限多张卡完全重叠
  const finishSort = (important) => {
    if (!sortId) return;
    const jitter = () => (Math.random() - 0.5) * 0.12;
    const x = clamp((sortUrgent ? 0.27 : 0.73) + jitter(), 0.06, 0.94);
    const y = clamp((important ? 0.27 : 0.73) + jitter(), 0.06, 0.94);
    updateTodoProps(sortId, { matrixPos: { x, y } });
    setSettlingId(sortId);
    setSortId(null);
    setSortUrgent(null);
  };

  const sortTodo = sortId ? todos.find((td) => td.id === sortId) : null;

  const renderTag = (todo, sortable = false) => (
    <TaskTag
      key={todo.id}
      todo={todo}
      focused={isFocused(todo.id)}
      settling={settlingId === todo.id}
      dragging={drag?.id === todo.id}
      onActivate={toggleFocusTodo}
      onDelete={deleteTodo}
      onPointerDown={handlePointerDown}
      onSort={sortable ? startSort : undefined}
      sortCta={t("focus.matrix.sortCta")}
      sortAria={t("focus.matrix.sortAria", { text: todo.text })}
      deleteAria={t("focus.matrix.deleteAria", { text: todo.text })}
    />
  );

  const overPlane = drag?.zone === "plane";
  const overTray = drag?.zone === "tray";

  return (
    <div className="matrix-container" aria-label={t("focus.matrix.title")}>
      <div className="matrix-header">
        <span className="matrix-title">{t("focus.matrix.title")}</span>
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
        <button type="submit" className="matrix-add">
          {t("focus.matrix.add")}
        </button>
      </form>

      {/* 坐标轴提示：横轴＝紧急（左紧急、右不紧急） */}
      <div className="matrix-axis-x">
        <span>← {t("focus.matrix.urgent")}</span>
        <span>{t("focus.matrix.notUrgent")} →</span>
      </div>

      <div className="matrix-board">
        {/* 纵轴＝重要（上重要、下不重要），箭头稳定上下指向 */}
        <div className="matrix-axis-y" aria-hidden="true">
          <span className="matrix-axis-y-cap">↑</span>
          <span className="matrix-axis-y-word">{t("focus.matrix.important")}</span>
          <span className="matrix-axis-y-word muted">{t("focus.matrix.notImportant")}</span>
          <span className="matrix-axis-y-cap">↓</span>
        </div>

        <div
          ref={planeRef}
          className={`matrix-plane${overPlane ? " drag-over" : ""}`}
        >
          {CORNERS.map((c) => (
            <span key={c.id} className={`matrix-corner ${c.pos}`} aria-hidden="true">
              {t(`focus.matrix.${c.id}`)}
            </span>
          ))}

          {placed.length === 0 && (
            <span className="matrix-plane-empty">{t("focus.matrix.dropHere")}</span>
          )}

          {placed.map((todo) => {
            // 越靠左上（重要且紧急）卡片越大：以到左上角的接近度换算缩放
            const weight = (1 - todo.matrixPos.x) * 0.5 + (1 - todo.matrixPos.y) * 0.5;
            const scale = scaleFor(todo.matrixPos.x, todo.matrixPos.y);
            return (
              <div
                key={todo.id}
                className="matrix-node"
                style={{
                  left: `${todo.matrixPos.x * 100}%`,
                  top: `${todo.matrixPos.y * 100}%`,
                  "--matrix-scale": scale.toFixed(3),
                  zIndex: Math.round(weight * 100),
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
        <span className="matrix-tray-label">{t("focus.matrix.unclassified")}</span>
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

      {/* 两步是非题：把「感觉放哪」拆成两个封闭问题，自动落到象限 */}
      {sortTodo && (
        <div className="matrix-sort-overlay" onClick={cancelSort} role="presentation">
          <div
            className="matrix-sort-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t("focus.matrix.sortHeading", { text: sortTodo.text })}
          >
            <span className="matrix-sort-heading">
              {t("focus.matrix.sortHeading", { text: sortTodo.text })}
            </span>

            <p className="matrix-sort-question">
              {sortUrgent === null
                ? t("focus.matrix.qUrgent")
                : t("focus.matrix.qImportant")}
            </p>

            <div className="matrix-sort-answers">
              <button
                type="button"
                className="matrix-sort-answer yes"
                onClick={() =>
                  sortUrgent === null ? setSortUrgent(true) : finishSort(true)
                }
              >
                {t("focus.matrix.answerYes")}
              </button>
              <button
                type="button"
                className="matrix-sort-answer no"
                onClick={() =>
                  sortUrgent === null ? setSortUrgent(false) : finishSort(false)
                }
              >
                {t("focus.matrix.answerNo")}
              </button>
            </div>

            <div className="matrix-sort-footer">
              <div className="matrix-sort-steps" aria-hidden="true">
                <span className="matrix-sort-dot active" />
                <span className={`matrix-sort-dot${sortUrgent !== null ? " active" : ""}`} />
              </div>
              {sortUrgent !== null ? (
                <button
                  type="button"
                  className="matrix-sort-nav"
                  onClick={() => setSortUrgent(null)}
                >
                  {t("focus.matrix.sortBack")}
                </button>
              ) : (
                <button
                  type="button"
                  className="matrix-sort-nav"
                  onClick={cancelSort}
                >
                  {t("focus.matrix.sortCancel")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
