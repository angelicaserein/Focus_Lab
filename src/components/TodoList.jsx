import React from "react";
import { useTodos } from "../context/TodoContext";
import TodoItem from "./TodoItem";

export default function TodoList({ filter = "ALL" }) {
  const { todos } = useTodos();

  const filtered = todos.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return !t.completed;
    if (filter === "COMPLETED") return !!t.completed;
    return true;
  });

  if (!filtered || filtered.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 12 }}>
        <div className="empty-emoji">✨</div>
        <div className="empty-text">空空如也 — 添加第一个任务吧</div>
      </div>
    );
  }

  return (
    <section className="todo-list" aria-live="polite" data-filter={filter}>
      {filtered.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </section>
  );
}
