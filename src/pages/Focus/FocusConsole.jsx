import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import EisenhowerMatrix from "@/components/todo/EisenhowerMatrix";
import { useLanguage } from "@/context/LanguageContext";
import { useFeatures } from "@/context/FeatureContext";
import { FEATURE_KEYS } from "@/pages/FunctionTree/functionTreeData";
import RandomTaskDrawer from "@/pages/Focus/RandomTaskDrawer";
import RecommendStrip from "@/pages/Focus/RecommendStrip";
import FocusDurationPicker from "@/pages/Focus/FocusDurationPicker";

// 普通（非沉浸）视图：上=四象限，中=计时控制台（今天做什么/正倒计时/时长/开始）+情景与推荐，
// 下=已选任务卡，纵向堆叠。
// 随记 / 分心 / 聊天记录已移至历史页统一回顾，本页专注于「开始一次专注」。
// React.memo：计时器每 500ms tick 会让 FocusPage 重渲染，但本组件不消费 seconds，
// props 引用稳定（计时器回调已 useCallback，context 方法来自不随 tick 重渲染的祖先），
// memo 后即可在 tick 时跳过，连带跳过内部的四象限任务板。
function FocusConsole({
  selectedTodos,
  hasSelection,
  canReset,
  scenarios = [],
  selectedScenarioId,
  scenarioDescription,
  onScenarioChange,
  timerMode = "countup",
  onTimerModeChange,
  durationMins,
  onDurationChange,
  presets = [15, 25, 45],
  canEditDuration = true,
  onStart,
  onReset,
  onClear,
  onRemoveFocus,
  onDrawerSelect,
  availableTodos = [],
  onAddFocus,
  onStartImmersive,
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showDrawer, setShowDrawer] = useState(false);

  // 没选情景时，温柔地问一句要不要设个情景，并给一个直达「情景配置」的入口——
  // 因为很多时候会忘记去左侧栏配置、这个功能就荒废了。可「这次先不用」在本次会话内忽略，
  // 不唠叨；选定情景后引导自然消失。dismiss 只存本次挂载，下次进专注页会再次提醒。
  // 情景功能被关掉时不再劝设情景，也不显示选择器——否则引导会把用户送去一个已经
  // 不可达的配置页，等于在推销一个他刚刚亲手关掉的功能。
  const { isEnabled } = useFeatures();
  const scenarioPickerOn = isEnabled(FEATURE_KEYS.SCENARIO_PICKER);
  const [scenarioNudgeDismissed, setScenarioNudgeDismissed] = useState(false);
  const showScenarioNudge =
    scenarioPickerOn && !selectedScenarioId && !scenarioNudgeDismissed;
  const showScenarioPicker = scenarioPickerOn && scenarios.length > 0;
  // 情景整块（引导 + 选择器）都不显示时，计时控制台独占整张卡，不留空的左半边。
  const hasScenarioSide = showScenarioNudge || showScenarioPicker;

  return (
    <div className="page-focus">
      {showDrawer && (
        <RandomTaskDrawer
          onSelect={(todo) => onDrawerSelect(todo)}
          onClose={() => setShowDrawer(false)}
        />
      )}

      <div className="focus-shell">
        <div className="focus-main">
          {/* 上：紧急/重要四象限 —— 任务以小标签呈现，可拖拽归类 */}
          <div className="focus-col-right">
            <EisenhowerMatrix onStartImmersive={onStartImmersive} />
          </div>

          {/* 中：计时控制台（今天做什么 → 正/倒计时 → 时长 → 开始）+ 情景；
              已选任务单独成卡，落在整页最下方 */}
          <div className="focus-col-left">
            <div className="focus-card focus-card-wide">
              {hasScenarioSide && (
                <div className="focus-card-tasks">
                  {/* 情景引导：没选情景时问一句要不要设定，直达情景配置页 */}
                  {showScenarioNudge && (
                    <div className="focus-scenario-nudge">
                      <p className="focus-scenario-nudge-text">{t("focus.scenarioNudge")}</p>
                      <div className="focus-scenario-nudge-actions">
                        <button
                          type="button"
                          className="focus-scenario-nudge-go"
                          onClick={() => navigate("/scenario")}
                        >
                          {t("focus.scenarioNudgeGo")}
                        </button>
                        <button
                          type="button"
                          className="focus-scenario-nudge-skip"
                          onClick={() => setScenarioNudgeDismissed(true)}
                        >
                          {t("focus.scenarioNudgeSkip")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 情境选择：功能开着且有情境时才显示 */}
                  {showScenarioPicker && (
                    <div className="focus-scenario-row">
                      <label className="focus-scenario-label" htmlFor="focus-scenario-select">
                        {t("focus.scenario")}
                      </label>
                      <select
                        id="focus-scenario-select"
                        className="focus-scenario-select"
                        value={selectedScenarioId ?? ""}
                        onChange={(e) => onScenarioChange(e.target.value || null)}
                      >
                        <option value="">{t("focus.noScenario")}</option>
                        {scenarios.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                      {scenarioDescription && (
                        <div className="focus-scenario-desc">{scenarioDescription}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`focus-card-controls${hasScenarioSide ? "" : " focus-card-controls-solo"}`}
              >
                {/* 今天做什么？抽一个任务 —— 放在计时模式与开始按钮之上 */}
                <button
                  type="button"
                  className="focus-draw-btn"
                  onClick={() => setShowDrawer(true)}
                >
                  {t("focus.whatToday")}
                </button>

                <div className="focus-mode-toggle" role="group" aria-label={t("focus.timerModeAria")}>
                  <button
                    type="button"
                    className={`focus-mode-btn${timerMode !== "countdown" ? " active" : ""}`}
                    onClick={() => onTimerModeChange?.("countup")}
                    aria-pressed={timerMode !== "countdown"}
                  >
                    {t("focus.countup")}
                  </button>
                  <button
                    type="button"
                    className={`focus-mode-btn${timerMode === "countdown" ? " active" : ""}`}
                    onClick={() => onTimerModeChange?.("countdown")}
                    aria-pressed={timerMode === "countdown"}
                  >
                    {t("focus.countdown")}
                  </button>
                </div>

                {/* 烧瓶时长：随当前模式作用于正计时注满时长 / 倒计时起始时长 */}
                <FocusDurationPicker
                  timerMode={timerMode}
                  durationMins={durationMins}
                  onDurationChange={onDurationChange}
                  presets={presets}
                  canEdit={canEditDuration}
                />

                <div className="focus-actions">
                  <button
                    className="focus-action-btn primary"
                    type="button"
                    onClick={onStart}
                    disabled={!hasSelection}
                  >
                    {t("focus.start")}
                  </button>
                  <button
                    className="focus-action-btn secondary"
                    type="button"
                    onClick={onReset}
                    disabled={!canReset}
                  >
                    {t("focus.reset")}
                  </button>
                </div>
              </div>
            </div>

            {/* 情景推荐：有「当前情景」时，主动推荐候选任务 */}
            <RecommendStrip availableTodos={availableTodos} onPick={onAddFocus} />

            {/* 下：已选任务（可多选）独立成卡，收在整页最底部 */}
            <div className="focus-card focus-selected-card">
              <div className="focus-card-header">
                <span className="card-label">
                  {t("focus.selectedTasks")}
                  {hasSelection && <span className="focus-count">{selectedTodos.length}</span>}
                </span>
                <button
                  type="button"
                  className="clear-focus"
                  onClick={onClear}
                  disabled={!hasSelection}
                >
                  {t("focus.clear")}
                </button>
              </div>

              {hasSelection ? (
                <div className="focus-chip-list">
                  {selectedTodos.map((todo) => (
                    <span key={todo.id} className="focus-chip">
                      <span className="focus-chip-text">{todo.text}</span>
                      <button
                        type="button"
                        className="focus-chip-remove"
                        onClick={() => onRemoveFocus(todo.id)}
                        aria-label={t("focus.removeTask", { text: todo.text })}
                        title={t("focus.remove")}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="focus-task-placeholder">
                  {t("focus.taskPlaceholder")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(FocusConsole);
