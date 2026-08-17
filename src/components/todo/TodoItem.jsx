import React, { useState, useMemo, useRef } from "react";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import RecurringDayPicker from "@/components/todo/RecurringDayPicker";
import TaskTagPicker from "@/components/todo/TaskTagPicker";
import useOutsideClick from "@/hooks/common/useOutsideClick";
import useEditMode from "@/hooks/common/useEditMode";
import TodoItemActions from "@/components/todo/TodoItemActions";
import TodoItemDisplay from "@/components/todo/TodoItemDisplay";
import { onActivateKey } from "@/utils/a11y";

export default function TodoItem({ todo, isOtherDay = false }) {
  const { toggleTodo, deleteTodo, editTodo, toggleRecurring, setTodoAttr } = useTodos();
  const { isFocused, toggleFocusTodo } = useFocus();
  const { t } = useLanguage();
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
      role="listitem"
    >
      <div
        className={`todo-item ${isNew ? "new" : ""} ${
          removing ? "removing" : ""
        } ${editing ? "editing" : ""} ${
          isFocused(todo.id) ? "selected" : ""
        } ${recurringDays.length > 0 ? "recurring" : ""}`}
        // 行本身是个开关（选入/移出专注清单），所以是 button 不是 listitem——
        // aria-pressed 只在 button 上有意义。listitem 交给外层 wrap 承担。
        role="button"
        aria-label={todo.text}
        aria-pressed={isFocused(todo.id)}
        // 整行可点 = 加入/移出专注清单。行里嵌着复选框和按钮，做不成 <button>，
        // 只能自己补 tabIndex + 键盘激活，否则这个操作纯键盘用户够不着。
        tabIndex={editing ? -1 : 0}
        onClick={handleRowClick}
        onKeyDown={onActivateKey(() => {
          if (!editing) toggleFocusTodo(todo.id);
        })}
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
            aria-label={t("todo.editAria")}
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
          aria-label={t("todo.deleteAria", { text: todo.text })}
          title={t("todo.deleteTitle")}
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
