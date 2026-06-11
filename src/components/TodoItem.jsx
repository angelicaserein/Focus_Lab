import React, { useState, useMemo } from "react";
import { useTodos } from "../context/TodoContext";

export default function TodoItem({ todo }) {
  const { toggleTodo, deleteTodo } = useTodos();
  const [removing, setRemoving] = useState(false);

  const isNew = useMemo(() => {
    const created = Number(todo.id);
    if (!created) return false;
    return Date.now() - created < 2000;
  }, [todo.id]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => deleteTodo(todo.id), 320);
  };

  return (
    <div
      className={`todo-item ${isNew ? "new" : ""} ${
        removing ? "removing" : ""
      }`}
      role="listitem"
      aria-label={todo.text}
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

      <div className={`todo-text ${todo.completed ? "completed" : ""}`}>
        {todo.text}
      </div>

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
