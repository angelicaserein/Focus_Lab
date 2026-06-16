import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTodos } from "../context/TodoContext";
import { useFocus } from "../context/FocusContext";
import RecurringDayPicker, { recurringLabel } from "./RecurringDayPicker";

export default function TodoItem({ todo }) {
  const { toggleTodo, deleteTodo, editTodo, toggleRecurring } = useTodos();
  const { isFocused, toggleFocusTodo } = useFocus();
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const isNew = useMemo(() => {
    if (!todo.createdAt) return false;
    return Date.now() - todo.createdAt < 2000;
  }, [todo.createdAt]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!showDayPicker) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDayPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDayPicker]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => deleteTodo(todo.id), 320);
  };

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(todo.text);
    setEditing(true);
  };

  const commitEdit = () => {
    const t = draft.trim();
    if (t && t !== todo.text) editTodo(todo.id, t);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(todo.text);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleRowClick = (e) => {
    if (editing) return;
    if (e.target.closest("button") || e.target.closest(".checkbox-wrap")) return;
    toggleFocusTodo(todo.id);
  };

  const recurringDays = todo.recurringDays ?? [];
  const label = recurringLabel(recurringDays);

  return (
    <div className={`todo-item-wrap${showDayPicker ? ' picker-open' : ''}`} ref={wrapRef}>
      <div
        className={`todo-item ${isNew ? "new" : ""} ${
          removing ? "removing" : ""
        } ${editing ? "editing" : ""} ${
          isFocused(todo.id) ? "selected" : ""
        } ${recurringDays.length > 0 ? "recurring" : ""}`}
        role="listitem"
        aria-label={todo.text}
        onClick={handleRowClick}
      >
        <label className="checkbox-wrap">
          <input
            className="native-checkbox"
            type="checkbox"
            checked={!!todo.completed}
            onChange={() => toggleTodo(todo.id)}
            aria-label={`标记 ${todo.text} 为完成`}
          />
          <span
            className={`custom-checkbox ${todo.completed ? "checked" : ""}`}
          />
        </label>

        {editing ? (
          <input
            ref={inputRef}
            className="todo-edit-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            onClick={(e) => e.stopPropagation()}
            aria-label="编辑任务"
          />
        ) : (
          <div className={`todo-text ${todo.completed ? "completed" : ""}`}>
            {recurringDays.length > 0 && (
              <span className="recurring-icon" title={`固定：${label}`}>↺</span>
            )}
            {todo.text}
          </div>
        )}

        {!editing && (
          <>
            <button
              className={`recurring-item-btn${recurringDays.length > 0 ? " active" : ""}`}
              onClick={(e) => { e.stopPropagation(); setShowDayPicker(v => !v); }}
              title={recurringDays.length > 0 ? `固定：${label}` : "设为固定任务"}
              aria-pressed={recurringDays.length > 0}
            >
              ↺{recurringDays.length > 0 && (
                <span className="recurring-btn-label">{label}</span>
              )}
            </button>
            <button
              className="edit-btn"
              onClick={startEdit}
              aria-label={`编辑 ${todo.text}`}
              title="编辑任务"
            >
              ✎
            </button>
          </>
        )}

        <button
          className="delete-btn"
          onClick={handleDelete}
          aria-label={`删除 ${todo.text}`}
          title="删除任务"
        >
          ×
        </button>
      </div>

      {showDayPicker && (
        <RecurringDayPicker
          days={recurringDays}
          onChange={(d) => toggleRecurring(todo.id, d)}
          onClose={() => setShowDayPicker(false)}
        />
      )}
    </div>
  );
}
