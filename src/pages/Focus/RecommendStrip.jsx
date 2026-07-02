import React from "react";
import useScenarioRecommend from "../../hooks/useScenarioRecommend";
import RecommendItem from "../../components/RecommendItem";

// 专注页左栏推荐条：基于当前情景 + 候选任务（未在专注、未完成）主动推荐。
// 每条「+ 加入专注」调 onPick（= addToFocus）。仅在有激活情景且有候选时渲染。
export default function RecommendStrip({ availableTodos, onPick }) {
  const { hasScenario, ranked, aiStatus, aiEnabled, runAi } = useScenarioRecommend({
    todos: availableTodos,
    limit: 3,
  });

  if (!hasScenario || ranked.length === 0) return null;

  return (
    <div className="focus-card focus-recommend">
      <div className="focus-card-header">
        <span className="card-label">情景推荐</span>
        {aiEnabled && (
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
      <div className="rec-list">
        {ranked.map((entry) => (
          <RecommendItem
            key={entry.todo.id}
            entry={entry}
            action={
              <button
                type="button"
                className="rec-add-btn"
                onClick={() => onPick(entry.todo.id)}
                title="加入本次专注"
                aria-label={`加入专注：${entry.todo.text}`}
              >
                + 加入
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}
