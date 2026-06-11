import React from "react";
import { useTodos } from "../context/TodoContext";
import TodoItem from "./TodoItem";

export default function TodoList() {
  const { todos } = useTodos();

  if (!todos || todos.length === 0) {
    return (
      <div style={{ padding: 8, color: "#6b7280" }}>
        暂无任务，试着添加一个吧。
      </div>
    );
  }

  return (
    <section className="todo-list" aria-live="polite">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </section>
  );
}
