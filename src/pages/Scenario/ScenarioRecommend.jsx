import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useScenarios } from "@/context/ScenarioContext";
import { useTodos } from "@/context/TodoContext";
import { useDatabases } from "@/context/DatabaseContext";
import { aiErrorMessageKey } from "@/utils/ai/aiClient";
import { useLanguage } from "@/context/LanguageContext";
import useScenarioRecommend from "@/hooks/scenario/useScenarioRecommend";
import RecommendItem from "@/components/ui/RecommendItem";

// 情景页第三张卡「现在最适合做」：基于当前激活情景对「当前任务库」主动排序。
// 无激活情景时给引导；有则展示 Top N + 规则理由，并可点「✨ AI 精排」叠加 AI 重排/理由。
export default function ScenarioRecommend() {
  const { activeScenario } = useScenarios();
  const { todos } = useTodos();
  const { activeDatabaseId } = useDatabases();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // 与任务页一致：推荐限定在当前库（priority 权重也取自当前库列定义）。
  const dbTodos = useMemo(
    () => todos.filter((t) => (t.databaseId ?? "default") === activeDatabaseId),
    [todos, activeDatabaseId],
  );

  const { hasScenario, envProfile, ranked, aiStatus, aiErrorKind, aiEnabled, runAi } =
    useScenarioRecommend({ todos: dbTodos, limit: 5 });

  const goFocus = () =>
    navigate("/focus", { state: { scenarioId: activeScenario?.id } });

  return (
    <section className="scenario-card scenario-recommend-card" aria-live="polite">
      <div className="header">
        <div className="title">
          {t("scenario.rec.title")}
          {/* 环境标签是 i18n key（见 deriveEnvProfile），不是可直接显示的文案 */}
          {envProfile?.labelKey && (
            <span className="rec-env-tag">{t(envProfile.labelKey)}</span>
          )}
        </div>
        {hasScenario && ranked.length > 0 && aiEnabled && (
          <button
            type="button"
            className="rec-ai-btn"
            onClick={runAi}
            disabled={aiStatus === "loading"}
          >
            {aiStatus === "loading" ? t("scenario.rec.aiLoading") : t("scenario.rec.aiBtn")}
          </button>
        )}
      </div>

      {!hasScenario ? (
        <div className="scenario-config-empty">{t("scenario.rec.noScenario")}</div>
      ) : ranked.length === 0 ? (
        <div className="scenario-config-empty">{t("scenario.rec.noTasks")}</div>
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
                  title={t("scenario.rec.goTitle")}
                  aria-label={t("scenario.rec.goAria", { task: entry.todo.text })}
                >
                  ▶
                </button>
              }
            />
          ))}
          {aiStatus === "error" && (
            <div className="rec-ai-error">
              {aiErrorKind ? t(aiErrorMessageKey(aiErrorKind)) : t("scenario.rec.aiError")}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
