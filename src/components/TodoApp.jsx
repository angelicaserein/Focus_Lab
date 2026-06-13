import React, { useState } from "react";
import TodoForm from "./TodoForm";
import TodoList from "./TodoList";
import TodoStats from "./TodoStats";

export default function TodoApp() {
  const [filter, setFilter] = useState("ALL");

  return (
    <main className="todo-container" role="application" aria-label="Todo App">
      <div className="header">
        <div className="title">To do list</div>

        <div className="filter-tabs" role="tablist" aria-label="筛选任务">
          <button
            role="tab"
            aria-selected={filter === "ALL"}
            className={`tab ${filter === "ALL" ? "active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            全部
          </button>
          <button
            role="tab"
            aria-selected={filter === "ACTIVE"}
            className={`tab ${filter === "ACTIVE" ? "active" : ""}`}
            onClick={() => setFilter("ACTIVE")}
          >
            未完成
          </button>
          <button
            role="tab"
            aria-selected={filter === "COMPLETED"}
            className={`tab ${filter === "COMPLETED" ? "active" : ""}`}
            onClick={() => setFilter("COMPLETED")}
          >
            已完成
          </button>
        </div>
      </div>

      <TodoForm />

      <TodoList filter={filter} />

      <TodoStats />
    </main>
  );
}
