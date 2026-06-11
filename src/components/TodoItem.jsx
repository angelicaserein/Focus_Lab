import React from "react";
import { useTodos } from "../context/TodoContext";

export default function TodoItem({ todo }) {
  const { toggleTodo, deleteTodo } = useTodos();

  return (
    <div className="todo-item" role="listitem">
      <input
        type="checkbox"
        checked={!!todo.completed}
        onChange={() => toggleTodo(todo.id)}
        aria-label={`标记 ${todo.text} 为完成`}
      />
      <div className={`todo-text ${todo.completed ? "completed" : ""}`}>
        {todo.text}
      </div>
      <button
        className="delete-btn"
        onClick={() => deleteTodo(todo.id)}
        aria-label={`删除 ${todo.text}`}
      >
        删除
      </button>
    </div>
  );
}
