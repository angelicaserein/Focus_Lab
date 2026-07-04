import React, { useMemo, useState } from "react";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import "./EisenhowerMatrix.css";

// 紧急/重要四象限（艾森豪威尔矩阵）：
//   替代原「右栏 To do list」。任务以小标签呈现，可在四象限之间自由拖拽，
//   落点写入 todo.quadrant；拖回底部「未分类」托盘则清空归类。
//   点击标签＝加入/移出本次专注（与左栏「已选任务」联动）。

// 象限顺序即网格排布：左上 q1、右上 q2、左下 q3、右下 q4
// （行＝重要度自上而下降，列＝紧急度自左向右降）
const QUADRANTS = [
  { id: "q1", emoji: "🔥" },
  { id: "q2", emoji: "🎯" },
  { id: "q3", emoji: "⚡" },
  { id: "q4", emoji: "🌱" },
];
const QUADRANT_IDS = new Set(QUADRANTS.map((q) => q.id));

function TaskTag({ todo, focused, onClick, onDelete, onDragStart, onDragEnd, deleteAria }) {
  return (
    <span
      className={`matrix-tag${focused ? " focused" : ""}`}
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
  const [dropZone, setDropZone] = useState(null); // 当前拖拽悬停的落区 id

  // 未完成任务按象限分组；未归类（无 quadrant 或非法值）进入托盘
  const grouped = useMemo(() => {
    const buckets = { q1: [], q2: [], q3: [], q4: [], unclassified: [] };
    for (const todo of todos) {
      if (todo.completed) continue;
      const q = QUADRANT_IDS.has(todo.quadrant) ? todo.quadrant : "unclassified";
      buckets[q].push(todo);
    }
    return buckets;
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
    setDropZone(null);
  };

  // zone = 象限 id 或 "unclassified"（清空归类）
  const handleDrop = (e, zone) => {
    e.preventDefault();
    const id = dragId || e.dataTransfer.getData("text/plain");
    setDropZone(null);
    setDragId(null);
    if (!id) return;
    updateTodoProps(id, { quadrant: zone === "unclassified" ? undefined : zone });
  };

  const allowDrop = (e, zone) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropZone !== zone) setDropZone(zone);
  };

  const renderTag = (todo) => (
    <TaskTag
      key={todo.id}
      todo={todo}
      focused={isFocused(todo.id)}
      onClick={toggleFocusTodo}
      onDelete={deleteTodo}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      deleteAria={t("focus.matrix.deleteAria", { text: todo.text })}
    />
  );

  const unclassified = grouped.unclassified;

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

      {/* 坐标轴提示：横轴＝紧急，纵轴＝重要 */}
      <div className="matrix-axis-x">
        <span>← {t("focus.matrix.urgent")}</span>
        <span>{t("focus.matrix.notUrgent")} →</span>
      </div>

      <div className="matrix-board">
        <div className="matrix-axis-y" aria-hidden="true">
          <span>↑ {t("focus.matrix.important")}</span>
          <span>{t("focus.matrix.notImportant")} ↓</span>
        </div>

        <div className="matrix-grid">
          {QUADRANTS.map((q) => (
            <div
              key={q.id}
              className={`matrix-cell ${q.id}${dropZone === q.id ? " drag-over" : ""}`}
              onDragOver={(e) => allowDrop(e, q.id)}
              onDragLeave={() => setDropZone((z) => (z === q.id ? null : z))}
              onDrop={(e) => handleDrop(e, q.id)}
            >
              <div className="matrix-cell-head">
                <span className="matrix-cell-emoji">{q.emoji}</span>
                <span className="matrix-cell-title">{t(`focus.matrix.${q.id}`)}</span>
                <span className="matrix-cell-sub">{t(`focus.matrix.${q.id}Sub`)}</span>
              </div>
              <div className="matrix-cell-tags">
                {grouped[q.id].length > 0 ? (
                  grouped[q.id].map(renderTag)
                ) : (
                  <span className="matrix-cell-empty">{t("focus.matrix.dropHere")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 未分类托盘：新建任务先落这里，拖入象限完成归类 */}
      <div
        className={`matrix-tray${dropZone === "unclassified" ? " drag-over" : ""}`}
        onDragOver={(e) => allowDrop(e, "unclassified")}
        onDragLeave={() => setDropZone((z) => (z === "unclassified" ? null : z))}
        onDrop={(e) => handleDrop(e, "unclassified")}
      >
        <span className="matrix-tray-label">{t("focus.matrix.unclassified")}</span>
        <div className="matrix-tray-tags">
          {unclassified.length > 0 ? (
            unclassified.map(renderTag)
          ) : (
            <span className="matrix-cell-empty">{t("focus.matrix.trayEmpty")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
