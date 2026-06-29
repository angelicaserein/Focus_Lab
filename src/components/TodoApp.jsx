import React, { useState, useMemo } from "react";
import TodoForm from "./TodoForm";
import TodoList from "./TodoList";
import TodoStats from "./TodoStats";
import Toast from "./Toast";
import { useTodos } from "../context/TodoContext";
import { useScenarios } from "../context/ScenarioContext";
import { TASK_TYPE_OPTIONS } from "../utils/scenarioConstants";

const typeLabel = Object.fromEntries(TASK_TYPE_OPTIONS.map((o) => [o.id, `${o.icon} ${o.label}`]));

export default function TodoApp() {
  const [filter, setFilter] = useState("ALL");
  const { pendingDelete, undoDelete } = useTodos();
  const { activeScenario, clearActiveScenario } = useScenarios();

  const scenarioFilter = useMemo(() => {
    const types = activeScenario?.settings?.taskTypes ?? [];
    return types.length > 0 ? types : null;
  }, [activeScenario]);

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
          <button
            role="tab"
            aria-selected={filter === "RECURRING"}
            className={`tab ${filter === "RECURRING" ? "active" : ""}`}
            onClick={() => setFilter("RECURRING")}
          >
            ↺ 固定
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
            aria-label="退出当前情景"
          >
            × 退出情景
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
