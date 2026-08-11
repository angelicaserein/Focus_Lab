import React, { useMemo, useState } from "react";
import { useScenarios } from "@/context/ScenarioContext";
import { useDatabases } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import { optionLabel } from "@/utils/task/taskAttrUtils";
import { suggestScenarioConfig, hasApiKey } from "@/utils/ai/aiScenarioConfig";
import { planScenarioConfig } from "@/utils/scenario/scenarioConfigPlan";
import { DEFAULT_SCENARIO_SETTINGS } from "@/utils/scenario/scenarioConstants";

// 情境配置的 AI 助手：用户写一句情境描述，AI 翻译成一份配置（设备/交流/任务类型），
// 先出预览再由用户「应用」。新提出的设备/交流规则会在应用时并入全局选项表。
// 任何 AI 失败 / 无 key 都不影响手动配置，仅作锦上添花。
export default function ScenarioConfigAssistant({ scenario }) {
  const { scenarioOptions, addScenarioOptions, updateScenarioSettings } = useScenarios();
  const { allTagOptions } = useDatabases();
  const { t } = useLanguage();

  // AI 与 planScenarioConfig 都是按 label 文本认选项的（AI 只吐 label，不认 id），
  // 而出厂选项的文案在 i18n 里。所以在这个边界上先把 labelKey 兑成当前语言的 label
  // 再往下传——否则出厂选项在模型眼里全是空字符串，永远命中不了，只会一直「新建」。
  const withLabels = (opts) => (opts ?? []).map((o) => ({ ...o, label: optionLabel(t, o) }));
  const deviceOptions = useMemo(() => withLabels(scenarioOptions.devices), [scenarioOptions.devices, t]);
  const commOptions = useMemo(() => withLabels(scenarioOptions.communication), [scenarioOptions.communication, t]);
  const tagOptions = useMemo(() => withLabels(allTagOptions), [allTagOptions, t]);

  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [plan, setPlan] = useState(null);

  const run = async () => {
    const text = prompt.trim();
    if (!text || status === "loading") return;
    setStatus("loading");
    setPlan(null);
    try {
      const cfg = await suggestScenarioConfig(text, {
        deviceOptions,
        commOptions,
        tagOptions,
      });
      const next = planScenarioConfig(cfg, {
        deviceOptions,
        commOptions,
        tagOptions,
        baseSettings: scenario.settings ?? DEFAULT_SCENARIO_SETTINGS,
      });
      setPlan(next);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const apply = () => {
    if (!plan) return;
    addScenarioOptions(plan.newOptions);
    updateScenarioSettings(scenario.id, plan.settings);
    setPlan(null);
    setPrompt("");
  };

  const dismiss = () => setPlan(null);

  const p = plan?.preview;
  const nothing =
    p && !p.devices.length && !p.communication && !p.taskTypes.length;

  return (
    <div className="scenario-ai-config">
      <div className="scenario-ai-row">
        <textarea
          className="scenario-ai-input"
          rows={2}
          placeholder="用一句话描述这个情境，如「在图书馆戴耳机安静写论文」，AI 帮你配置"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); }
          }}
          aria-label="情境描述，交给 AI 配置"
        />
        <button
          type="button"
          className="scenario-ai-btn"
          onClick={run}
          disabled={!prompt.trim() || status === "loading"}
        >
          {status === "loading" ? "配置中…" : "✨ AI 配置"}
        </button>
      </div>

      {status === "error" && (
        <div className="scenario-ai-error">AI 配置失败，请稍后再试，或手动配置</div>
      )}

      {!hasApiKey() && status !== "loading" && !plan && (
        <div className="scenario-ai-hint">未配置 API key，将用离线示例做关键词粗配</div>
      )}

      {plan && (
        <div className="scenario-ai-preview" aria-live="polite">
          {nothing ? (
            <div className="scenario-ai-empty">没能从描述里提取到配置，换个说法再试试？</div>
          ) : (
            <>
              {p.note && <div className="scenario-ai-note">{p.note}</div>}

              {p.devices.length > 0 && (
                <div className="scenario-ai-line">
                  <span className="scenario-ai-key">设备</span>
                  <span className="scenario-ai-vals">
                    {p.devices.map((d, i) => (
                      <span key={i} className={`scenario-ai-chip${d.isNew ? " is-new" : ""}`}>
                        {d.label}{d.isNew && <em>新建</em>}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {p.communication && (
                <div className="scenario-ai-line">
                  <span className="scenario-ai-key">交流</span>
                  <span className="scenario-ai-vals">
                    <span className={`scenario-ai-chip${p.communication.isNew ? " is-new" : ""}`}>
                      {p.communication.label}{p.communication.isNew && <em>新建</em>}
                    </span>
                  </span>
                </div>
              )}

              {p.taskTypes.length > 0 && (
                <div className="scenario-ai-line">
                  <span className="scenario-ai-key">任务类型</span>
                  <span className="scenario-ai-vals">
                    {p.taskTypes.map((t, i) => (
                      <span key={i} className={`scenario-ai-chip${t.matched ? "" : " is-unmatched"}`}>
                        {t.label}{!t.matched && <em>无此标签</em>}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="scenario-ai-actions">
            {!nothing && (
              <button type="button" className="scenario-ai-apply" onClick={apply}>
                应用配置
              </button>
            )}
            <button type="button" className="scenario-ai-dismiss" onClick={dismiss}>
              {nothing ? "关闭" : "放弃"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
