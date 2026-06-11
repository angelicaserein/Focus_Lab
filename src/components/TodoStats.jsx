import React from "react";
import { useTodos } from "../context/TodoContext";

export default function TodoStats() {
  const { todos } = useTodos();
  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  return (
    <div className="stats" aria-live="polite">
      已完成 {done} / 总计 {total}
    </div>
  );
}
