import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTodos } from "../context/TodoContext";
import { useFocus } from "../context/FocusContext";
import RecurringDayPicker, { recurringLabel } from "./RecurringDayPicker";
import TaskTagPicker from "./TaskTagPicker";
import { TASK_TYPE_OPTIONS } from "../utils/scenarioConstants";

export default function TodoItem({ todo, isOtherDay = false }) {
  const { toggleTodo, deleteTodo, editTodo, toggleRecurring, editTodoTags } = useTodos();
  const { isFocused, toggleFocusTodo } = useFocus();
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
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
    if (!showDayPicker && !showTagPicker) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDayPicker(false);
        setShowTagPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDayPicker, showTagPicker]);

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

  const todoTags = todo.tags ?? [];
  const tagMap = Object.fromEntries(TASK_TYPE_OPTIONS.map((o) => [o.id, o]));

  return (
    <div className={`todo-item-wrap${showDayPicker ? ' picker-open' : ''}${showTagPicker ? ' tags-open' : ''}${isOtherDay ? ' other-day' : ''}`} ref={wrapRef}>
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
          <div className="todo-text-wrap">
            <div className={`todo-text ${todo.completed ? "completed" : ""}`}>
              {recurringDays.length > 0 && (
                <span className="recurring-icon" title={`固定：${label}`}>↺</span>
              )}
              {todo.text}
            </div>
            {todoTags.length > 0 && (
              <div className="todo-tags">
                {todoTags.map((id) => tagMap[id] && (
                  <span key={id} className="todo-tag-chip">
                    {tagMap[id].icon} {tagMap[id].label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {!editing && (
          <>
            <button
              className={`recurring-item-btn${recurringDays.length > 0 ? " active" : ""}`}
              onClick={(e) => { e.stopPropagation(); setShowDayPicker(v => !v); setShowTagPicker(false); }}
              title={recurringDays.length > 0 ? `固定：${label}` : "设为固定任务"}
              aria-pressed={recurringDays.length > 0}
            >
              ↺{recurringDays.length > 0 && (
                <span className="recurring-btn-label">{label}</span>
              )}
            </button>
            <button
              className={`tag-item-btn${todoTags.length > 0 ? " active" : ""}`}
              onClick={(e) => { e.stopPropagation(); setShowTagPicker(v => !v); setShowDayPicker(false); }}
              title="任务标签"
              aria-pressed={showTagPicker}
            >
              🏷
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

      {showTagPicker && (
        <TaskTagPicker
          tags={todoTags}
          onChange={(tags) => editTodoTags(todo.id, tags)}
          onClose={() => setShowTagPicker(false)}
        />
      )}
    </div>
  );
}
