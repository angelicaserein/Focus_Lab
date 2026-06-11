import React from "react";
import TodoForm from "./TodoForm";
import TodoList from "./TodoList";
import TodoStats from "./TodoStats";

export default function TodoApp() {
  return (
    <main className="todo-container" role="application" aria-label="Todo App">
      <div className="header">
        <div className="title">todo</div>
      </div>

      <TodoForm />

      <TodoList />

      <TodoStats />
    </main>
  );
}
