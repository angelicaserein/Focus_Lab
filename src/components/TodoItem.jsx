import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTodos } from "../context/TodoContext";

export default function TodoItem({ todo }) {
  const { toggleTodo, deleteTodo, editTodo, focusedTodoIds, toggleFocusTodo } = useTodos();
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const inputRef = useRef(null);

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
    // 忽略来自交互子元素（按钮 / 勾选框）的点击，避免误触
    if (e.target.closest("button") || e.target.closest(".checkbox-wrap")) return;
    // 点击整行 = 加入/移出本次专注集合（可多选；完成状态由勾选框切换）
    toggleFocusTodo(todo.id);
  };

  return (
    <div
      className={`todo-item ${isNew ? "new" : ""} ${
        removing ? "removing" : ""
      } ${editing ? "editing" : ""} ${
        focusedTodoIds.includes(todo.id) ? "selected" : ""
      }`}
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
          {todo.text}
        </div>
      )}

      {!editing && (
        <button
          className="edit-btn"
          onClick={startEdit}
          aria-label={`编辑 ${todo.text}`}
          title="编辑任务"
        >
          ✎
        </button>
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
  );
}
