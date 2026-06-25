import React, { useState } from "react";
import { useTodos } from "../context/TodoContext";
import { useFocus } from "../context/FocusContext";
import useEditableItem from "../hooks/useEditableItem";
import EditableItemShell from "./EditableItemShell";

export default function TodoItem({ todo }) {
  const { toggleTodo, deleteTodo, editTodo } = useTodos();
  const { focusedTodoIds, toggleFocusTodo } = useFocus();
  const [draft, setDraft] = useState(todo.text);

  const {
    removing,
    editing,
    isNew,
    inputRef,
    handleDelete,
    startEdit,
    commitEdit,
    handleKeyDown,
  } = useEditableItem({
    createdAt: todo.createdAt,
    onDelete: () => deleteTodo(todo.id),
    onEditStart: () => setDraft(todo.text),
    onCommit: () => {
      const t = draft.trim();
      if (t && t !== todo.text) editTodo(todo.id, t);
    },
    onCancel: () => setDraft(todo.text),
  });

  return (
    <EditableItemShell
      baseClass="todo-item"
      isNew={isNew}
      removing={removing}
      editing={editing}
      selected={focusedTodoIds.includes(todo.id)}
      label={todo.text}
      onRowToggle={() => toggleFocusTodo(todo.id)}
      onEdit={startEdit}
      onDelete={handleDelete}
      editLabel={`编辑 ${todo.text}`}
      editTitle="编辑任务"
      deleteLabel={`删除 ${todo.text}`}
      deleteTitle="删除任务"
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
    </EditableItemShell>
  );
}
