import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useTodos } from "../../context/TodoContext";
import { useDatabases } from "../../context/DatabaseContext";
import useScenarioRecommend from "../../hooks/useScenarioRecommend";
import RecommendItem from "../../components/RecommendItem";

// 情景页第三张卡「现在最适合做」：基于当前激活情景对「当前任务库」主动排序。
// 无激活情景时给引导；有则展示 Top N + 规则理由，并可点「✨ AI 精排」叠加 AI 重排/理由。
export default function ScenarioRecommend() {
  const { activeScenario } = useScenarios();
  const { todos } = useTodos();
  const { activeDatabaseId } = useDatabases();
  const navigate = useNavigate();

  // 与任务页一致：推荐限定在当前库（priority 权重也取自当前库列定义）。
  const dbTodos = useMemo(
    () => todos.filter((t) => (t.databaseId ?? "default") === activeDatabaseId),
    [todos, activeDatabaseId],
  );

  const { hasScenario, envProfile, ranked, aiStatus, aiEnabled, runAi } =
    useScenarioRecommend({ todos: dbTodos, limit: 5 });

  const goFocus = () =>
    navigate("/focus", { state: { scenarioId: activeScenario?.id } });

  return (
    <section className="scenario-card scenario-recommend-card" aria-live="polite">
      <div className="header">
        <div className="title">
          现在最适合做
          {envProfile?.label && <span className="rec-env-tag">{envProfile.label}</span>}
        </div>
        {hasScenario && ranked.length > 0 && aiEnabled && (
          <button
            type="button"
            className="rec-ai-btn"
            onClick={runAi}
            disabled={aiStatus === "loading"}
          >
            {aiStatus === "loading" ? "AI 精排中…" : "✨ AI 精排"}
          </button>
        )}
      </div>

      {!hasScenario ? (
        <div className="scenario-config-empty">
          先在上方点选一个情景作为「当前情景」，这里会推荐此刻最适合做的任务
        </div>
      ) : ranked.length === 0 ? (
        <div className="scenario-config-empty">
          当前任务库还没有可推荐的任务，去任务库添加一些吧
        </div>
      ) : (
        <div className="rec-list">
          {ranked.map((entry) => (
            <RecommendItem
              key={entry.todo.id}
              entry={entry}
              action={
                <button
                  type="button"
                  className="rec-go-btn"
                  onClick={goFocus}
                  title="去专注（预选此情景）"
                  aria-label={`去专注：${entry.todo.text}`}
                >
                  ▶
                </button>
              }
            />
          ))}
          {aiStatus === "error" && (
            <div className="rec-ai-error">AI 精排失败，已按规则排序展示</div>
          )}
        </div>
      )}
    </section>
  );
}
