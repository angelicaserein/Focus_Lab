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
//   放下瞬间卡片轻晃几下再稳住，模拟落在天平上的手感。
//   点击标签＝加入/移出本次专注（与左栏「已选任务」联动）。

// 四角象限暗示文字（沿用原 q1..q4 文案，仅作方位提示，不再是可落区）
const CORNERS = [
  { id: "q1", pos: "tl" }, // 左上：重要 + 紧急
  { id: "q2", pos: "tr" }, // 右上：重要 + 不紧急
  { id: "q3", pos: "bl" }, // 左下：不重要 + 紧急
  { id: "q4", pos: "br" }, // 右下：不重要 + 不紧急
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const isPlaced = (todo) =>
  !!todo.matrixPos &&
  typeof todo.matrixPos.x === "number" &&
  typeof todo.matrixPos.y === "number";

function TaskTag({ todo, focused, settling, onClick, onDelete, onDragStart, onDragEnd, deleteAria }) {
  return (
    <span
      className={`matrix-tag${focused ? " focused" : ""}${settling ? " settling" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, todo.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(todo.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(todo.id);
        }
      }}
      title={todo.text}
    >
      <span className="matrix-tag-text">{todo.text}</span>
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
  const [dragId, setDragId] = useState(null);
  const [overPlane, setOverPlane] = useState(false);
  const [overTray, setOverTray] = useState(false);
  const [settlingId, setSettlingId] = useState(null);
  const planeRef = useRef(null);

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

  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setOverPlane(false);
    setOverTray(false);
  };

  const allow = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // 落在平面：按光标位置换算 0..1 坐标（卡片中心对准落点），并触发回摆
  const dropOnPlane = (e) => {
    e.preventDefault();
    const id = dragId || e.dataTransfer.getData("text/plain");
    setOverPlane(false);
    setDragId(null);
    if (!id || !planeRef.current) return;
    const rect = planeRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0.045, 0.955);
    const y = clamp((e.clientY - rect.top) / rect.height, 0.06, 0.94);
    updateTodoProps(id, { matrixPos: { x, y } });
    setSettlingId(id);
  };

  // 拖回托盘：清空定位
  const dropOnTray = (e) => {
    e.preventDefault();
    const id = dragId || e.dataTransfer.getData("text/plain");
    setOverTray(false);
    setDragId(null);
    if (!id) return;
    updateTodoProps(id, { matrixPos: undefined });
  };

  const renderTag = (todo) => (
    <TaskTag
      key={todo.id}
      todo={todo}
      focused={isFocused(todo.id)}
      settling={settlingId === todo.id}
      onClick={toggleFocusTodo}
      onDelete={deleteTodo}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      deleteAria={t("focus.matrix.deleteAria", { text: todo.text })}
    />
  );

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
          onDragOver={(e) => {
            allow(e);
            if (!overPlane) setOverPlane(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setOverPlane(false);
          }}
          onDrop={dropOnPlane}
        >
          {CORNERS.map((c) => (
            <span key={c.id} className={`matrix-corner ${c.pos}`} aria-hidden="true">
              {t(`focus.matrix.${c.id}`)}
            </span>
          ))}

          {placed.length === 0 && (
            <span className="matrix-plane-empty">{t("focus.matrix.dropHere")}</span>
          )}

          {placed.map((todo) => (
            <div
              key={todo.id}
              className="matrix-node"
              style={{
                left: `${todo.matrixPos.x * 100}%`,
                top: `${todo.matrixPos.y * 100}%`,
              }}
              onAnimationEnd={() =>
                setSettlingId((s) => (s === todo.id ? null : s))
              }
            >
              {renderTag(todo)}
            </div>
          ))}
        </div>
      </div>

      {/* 未分类托盘：新建任务先落这里，拖入平面完成摆放 */}
      <div
        className={`matrix-tray${overTray ? " drag-over" : ""}`}
        onDragOver={(e) => {
          allow(e);
          if (!overTray) setOverTray(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setOverTray(false);
        }}
        onDrop={dropOnTray}
      >
        <span className="matrix-tray-label">{t("focus.matrix.unclassified")}</span>
        <div className="matrix-tray-tags">
          {unplaced.length > 0 ? (
            unplaced.map(renderTag)
          ) : (
            <span className="matrix-cell-empty">{t("focus.matrix.trayEmpty")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
