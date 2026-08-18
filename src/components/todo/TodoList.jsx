import React from "react";
import { useTodos } from "@/context/TodoContext";
import { useLanguage } from "@/context/LanguageContext";
import TodoItem from "@/components/todo/TodoItem";

export default function TodoList({ filter = "ALL", scenarioFilter = null }) {
  const { todos } = useTodos();
  const { t } = useLanguage();

  const filtered = todos.filter((t) => {
    if (filter === "ACTIVE" && t.completed) return false;
    if (filter === "COMPLETED" && !t.completed) return false;
    if (filter === "RECURRING" && !t.recurringDays?.length) return false;
    if (scenarioFilter && t.attrs?.tags?.length > 0) {
      return t.attrs.tags.some((tag) => scenarioFilter.includes(tag));
    }
    return true;
  });

  if (!filtered || filtered.length === 0) {
    if (filter === "RECURRING") {
      return (
        <div className="empty-state" style={{ padding: 12 }}>
          <div className="empty-emoji">↺</div>
          <div className="empty-text">{t("todo.list.emptyRecurring")}</div>
        </div>
      );
    }
    return (
      <div className="empty-state" style={{ padding: 12 }}>
        <div className="empty-emoji">✨</div>
        <div className="empty-text">{t("todo.list.empty")}</div>
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
            <div className="recurring-section-header">{t("todo.list.todaySection", { day: t(`day.long.${todayDow}`) })}</div>
            {todayTasks.map(todo => <TodoItem key={todo.id} todo={todo} />)}
          </div>
        )}
        {otherTasks.length > 0 && (
          <div className="recurring-section recurring-section-other">
            <div className="recurring-section-header">{t("todo.list.otherDays")}</div>
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
