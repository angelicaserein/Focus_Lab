import React, { useState, useMemo } from "react";
import TodoForm from "@/components/todo/TodoForm";
import TodoList from "@/components/todo/TodoList";
import TodoStats from "@/components/todo/TodoStats";
import Toast from "@/components/ui/Toast";
import { useTodos } from "@/context/TodoContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";
import { TASK_TYPE_OPTIONS } from "@/utils/scenario/scenarioConstants";

const typeLabel = Object.fromEntries(TASK_TYPE_OPTIONS.map((o) => [o.id, `${o.icon} ${o.label}`]));

export default function TodoApp() {
  const [filter, setFilter] = useState("ALL");
  const { pendingDelete, undoDelete } = useTodos();
  const { activeScenario, clearActiveScenario } = useScenarios();
  const { t } = useLanguage();

  const scenarioFilter = useMemo(() => {
    const types = activeScenario?.settings?.taskTypes ?? [];
    return types.length > 0 ? types : null;
  }, [activeScenario]);

  return (
    <main className="todo-container" role="application" aria-label="Todo App">
      <div className="header">
        <div className="title">To do list</div>

        <div className="filter-tabs" role="tablist" aria-label={t("todo.filterAria")}>
          <button
            role="tab"
            aria-selected={filter === "ALL"}
            className={`tab ${filter === "ALL" ? "active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            {t("todo.filter.all")}
          </button>
          <button
            role="tab"
            aria-selected={filter === "ACTIVE"}
            className={`tab ${filter === "ACTIVE" ? "active" : ""}`}
            onClick={() => setFilter("ACTIVE")}
          >
            {t("todo.filter.active")}
          </button>
          <button
            role="tab"
            aria-selected={filter === "COMPLETED"}
            className={`tab ${filter === "COMPLETED" ? "active" : ""}`}
            onClick={() => setFilter("COMPLETED")}
          >
            {t("todo.filter.completed")}
          </button>
          <button
            role="tab"
            aria-selected={filter === "RECURRING"}
            className={`tab ${filter === "RECURRING" ? "active" : ""}`}
            onClick={() => setFilter("RECURRING")}
          >
            {t("todo.filter.recurring")}
          </button>
        </div>
      </div>

      {scenarioFilter && (
        <div className="scenario-filter-badge">
          <span className="scenario-filter-label">
            {activeScenario.title}：{scenarioFilter.map((id) => typeLabel[id]).join(" · ")}
          </span>
          <button
            className="scenario-filter-clear"
            onClick={clearActiveScenario}
            aria-label={t("todo.scenarioExitAria")}
          >
            {t("todo.scenarioExit")}
          </button>
        </div>
      )}

      <TodoForm forceRecurring={filter === "RECURRING"} />

      <TodoList filter={filter} scenarioFilter={scenarioFilter} />

      <TodoStats />

      <Toast pendingDelete={pendingDelete} undoDelete={undoDelete} getText={(item) => item.text} />
    </main>
  );
}
