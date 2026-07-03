import React from "react";
import useScenarioRecommend from "@/hooks/scenario/useScenarioRecommend";
import RecommendItem from "@/components/ui/RecommendItem";
import { useLanguage } from "@/context/LanguageContext";

// 专注页左栏推荐条：基于当前情景 + 候选任务（未在专注、未完成）主动推荐。
// 每条「+ 加入专注」调 onPick（= addToFocus）。仅在有激活情景且有候选时渲染。
export default function RecommendStrip({ availableTodos, onPick }) {
  const { t } = useLanguage();
  const { hasScenario, ranked, aiStatus, aiEnabled, runAi } = useScenarioRecommend({
    todos: availableTodos,
    limit: 3,
  });

  if (!hasScenario || ranked.length === 0) return null;

  return (
    <div className="focus-card focus-recommend">
      <div className="focus-card-header">
        <span className="card-label">{t("focus.recommend")}</span>
        {aiEnabled && (
          <button
            type="button"
            className="rec-ai-btn"
            onClick={runAi}
            disabled={aiStatus === "loading"}
          >
            {aiStatus === "loading" ? t("focus.aiRanking") : t("focus.aiRank")}
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
                title={t("focus.addToFocus")}
                aria-label={t("focus.addToFocusAria", { text: entry.todo.text })}
              >
                {t("focus.add")}
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}
