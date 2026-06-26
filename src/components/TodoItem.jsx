import React, { useState, useMemo, useRef } from "react";
import { useTodos } from "../context/TodoContext";
import { useFocus } from "../context/FocusContext";
import RecurringDayPicker from "./RecurringDayPicker";
import TaskTagPicker from "./TaskTagPicker";
import useOutsideClick from "../hooks/useOutsideClick";
import useEditMode from "../hooks/useEditMode";
import TodoItemActions from "./TodoItemActions";
import TodoItemDisplay from "./TodoItemDisplay";

export default function TodoItem({ todo, isOtherDay = false }) {
  const { toggleTodo, deleteTodo, editTodo, toggleRecurring, setTodoAttr } = useTodos();
  const { isFocused, toggleFocusTodo } = useFocus();
  const [removing, setRemoving] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const wrapRef = useRef(null);

  const { editing, draft, setDraft, startEdit, commitEdit, cancelEdit, inputRef } =
    useEditMode(todo.text);

  const isNew = useMemo(() => {
    if (!todo.createdAt) return false;
    return Date.now() - todo.createdAt < 2000;
  }, [todo.createdAt]);

  const pickerOpen = showDayPicker || showTagPicker;
  useOutsideClick(wrapRef, () => { setShowDayPicker(false); setShowTagPicker(false); }, pickerOpen);

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => deleteTodo(todo.id), 320);
  };

  const handleCommitEdit = () =>
    commitEdit((text) => { if (text && text !== todo.text) editTodo(todo.id, text); });

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleCommitEdit(); }
    else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  };

  const handleRowClick = (e) => {
    if (editing) return;
    if (e.target.closest("button") || e.target.closest(".checkbox-wrap")) return;
    toggleFocusTodo(todo.id);
  };

  const recurringDays = todo.recurringDays ?? [];
  const todoTags = todo.attrs?.tags ?? [];

  return (
    <div
      className={`todo-item-wrap${showDayPicker ? ' picker-open' : ''}${showTagPicker ? ' tags-open' : ''}${isOtherDay ? ' other-day' : ''}`}
      ref={wrapRef}
    >
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
        {editing ? (
          <input
            ref={inputRef}
            className="todo-edit-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCommitEdit}
            onClick={(e) => e.stopPropagation()}
            aria-label="编辑任务"
          />
        ) : (
          <TodoItemDisplay
            todo={todo}
            recurringDays={recurringDays}
            todoTags={todoTags}
            onToggle={() => toggleTodo(todo.id)}
          />
        )}

        {!editing && (
          <TodoItemActions
            todo={todo}
            showDayPicker={showDayPicker}
            showTagPicker={showTagPicker}
            onToggleDayPicker={() => { setShowDayPicker((v) => !v); setShowTagPicker(false); }}
            onToggleTagPicker={() => { setShowTagPicker((v) => !v); setShowDayPicker(false); }}
            onStartEdit={startEdit}
          />
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
          onChange={(tags) => setTodoAttr(todo.id, "tags", tags)}
          onClose={() => setShowTagPicker(false)}
        />
      )}
    </div>
  );
}
