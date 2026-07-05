import React, { useState, useEffect } from "react";
import EisenhowerMatrix from "@/components/todo/EisenhowerMatrix";
import { useLanguage } from "@/context/LanguageContext";
import RandomTaskDrawer from "@/pages/Focus/RandomTaskDrawer";
import RecommendStrip from "@/pages/Focus/RecommendStrip";

// 时长选择：三档快捷预设（可在设置页自定义）+ 自定义输入，其余走自定义输入框。
const MIN_DURATION = 1;
const MAX_DURATION = 180;

// 普通（非沉浸）视图：上=计时控制台+情境选择+情景推荐，下=紧急/重要四象限，纵向堆叠。
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
}) {
  const { t } = useLanguage();
  const [showDrawer, setShowDrawer] = useState(false);

  // 当前时长是否为「自定义」（不落在预设里）——决定输入框是否高亮、是否回填数值
  const isCustomDuration = !presets.includes(durationMins);
  const [customDraft, setCustomDraft] = useState(isCustomDuration ? String(durationMins) : "");

  // durationMins 由外部改变时（切换正/倒计时会换成另一套存储值、或落到某个预设）
  // 让草稿重新对齐，避免残留上一模式的数字。用户输入中 durationMins 未变，不会打断。
  useEffect(() => {
    setCustomDraft(isCustomDuration ? String(durationMins) : "");
  }, [durationMins, isCustomDuration]);

  // 提交自定义时长：夹到 [MIN, MAX]；若落到预设值则清空草稿改由预设高亮
  const commitCustomDuration = (raw) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setCustomDraft(isCustomDuration ? String(durationMins) : "");
      return;
    }
    const clamped = Math.min(MAX_DURATION, Math.max(MIN_DURATION, n));
    onDurationChange?.(clamped);
    setCustomDraft(presets.includes(clamped) ? "" : String(clamped));
  };

  const pickPreset = (mins) => {
    setCustomDraft("");
    onDurationChange?.(mins);
  };

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
          {/* Top: timer console + 情景推荐 */}
          <div className="focus-col-left">
            {/* Top: timer console */}
            <div className="focus-card">
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
                <>
                  <div className="focus-task-placeholder">
                    {t("focus.taskPlaceholder")}
                  </div>
                  <button
                    type="button"
                    className="focus-draw-btn"
                    onClick={() => setShowDrawer(true)}
                  >
                    {t("focus.whatToday")}
                  </button>
                </>
              )}

              {/* 情境选择：有情境时才显示 */}
              {scenarios.length > 0 && (
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
              <div
                className="focus-duration-row"
                role="group"
                aria-label={timerMode === "countdown" ? t("focus.countdownDurationAria") : t("focus.fillDurationAria")}
              >
                <span className="focus-duration-label">
                  {t("focus.durationValue", {
                    label: timerMode === "countdown" ? t("focus.countdown") : t("focus.fillLabel"),
                    mins: durationMins,
                  })}
                </span>
                <div className="focus-duration-pills">
                  {presets.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className={`focus-duration-pill${!isCustomDuration && durationMins === mins ? " active" : ""}`}
                      onClick={() => pickPreset(mins)}
                      disabled={!canEditDuration}
                      aria-pressed={!isCustomDuration && durationMins === mins}
                    >
                      {mins}
                    </button>
                  ))}
                  <div className={`focus-duration-custom${isCustomDuration ? " active" : ""}`}>
                    <input
                      type="number"
                      className="focus-duration-input"
                      min={MIN_DURATION}
                      max={MAX_DURATION}
                      inputMode="numeric"
                      value={customDraft}
                      placeholder={t("focus.customDuration")}
                      disabled={!canEditDuration}
                      aria-label={t("focus.customDuration")}
                      onChange={(e) => setCustomDraft(e.target.value)}
                      onBlur={(e) => commitCustomDuration(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitCustomDuration(e.target.value);
                        }
                      }}
                    />
                    <span className="focus-duration-unit">{t("focus.minUnit")}</span>
                  </div>
                </div>
              </div>

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

            {/* 情景推荐：有「当前情景」时，主动推荐候选任务 */}
            <RecommendStrip availableTodos={availableTodos} onPick={onAddFocus} />
          </div>

          {/* Bottom: 紧急/重要四象限 —— 任务以小标签呈现，可拖拽归类 */}
          <div className="focus-col-right">
            <EisenhowerMatrix />
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(FocusConsole);
