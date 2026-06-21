import React from "react";
import { useTodos } from "../context/TodoContext";
import TodoItem from "./TodoItem";

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function TodoList({ filter = "ALL", scenarioFilter = null }) {
  const { todos } = useTodos();

  const filtered = todos.filter((t) => {
    if (filter === "ACTIVE" && t.completed) return false;
    if (filter === "COMPLETED" && !t.completed) return false;
    if (filter === "RECURRING" && !t.recurringDays?.length) return false;
    if (scenarioFilter && t.tags?.length > 0) {
      return t.tags.some((tag) => scenarioFilter.includes(tag));
    }
    return true;
  });

  if (!filtered || filtered.length === 0) {
    if (filter === "RECURRING") {
      return (
        <div className="empty-state" style={{ padding: 12 }}>
          <div className="empty-emoji">↺</div>
          <div className="empty-text">还没有固定任务 — 在上方输入每日必做清单</div>
        </div>
      );
    }
    return (
      <div className="empty-state" style={{ padding: 12 }}>
        <div className="empty-emoji">✨</div>
        <div className="empty-text">空空如也 — 添加第一个任务吧</div>
      </div>
    );
  }

  if (filter === "RECURRING") {
    const todayDow = new Date().getDay();
    const todayTasks = filtered.filter(t => t.recurringDays?.includes(todayDow));
    const otherTasks = filtered.filter(t => !t.recurringDays?.includes(todayDow));

    return (
      <section className="todo-list" aria-live="polite" data-filter={filter}>
        {todayTasks.length > 0 && (
          <div className="recurring-section">
            <div className="recurring-section-header">今天 · 周{DAY_NAMES[todayDow]}</div>
            {todayTasks.map(todo => <TodoItem key={todo.id} todo={todo} />)}
          </div>
        )}
        {otherTasks.length > 0 && (
          <div className="recurring-section recurring-section-other">
            <div className="recurring-section-header">其他天</div>
            {otherTasks.map(todo => <TodoItem key={todo.id} todo={todo} isOtherDay />)}
          </div>
        )}
      </section>
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
