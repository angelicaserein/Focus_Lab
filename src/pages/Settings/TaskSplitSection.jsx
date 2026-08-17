import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import useTaskSplitPrefs from "@/hooks/task/useTaskSplitPrefs";
import { GRANULARITIES } from "@/utils/ai/taskSplitPrefs";

// 「任务拆分」设置：倒脑子怎么把一段话拆成任务，长期生效。
// 粒度三档 + 先反问 + 猜不猜日期 + 一段自己写的规矩，
// 全部原样拼进 prompt（见 utils/ai/taskSplitPrefs.buildRulesHint）。
export default function TaskSplitSection() {
  const { t } = useLanguage();
  const { prefs, setPref, reset } = useTaskSplitPrefs();

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.split.title")}</div>
      <p className="settings-section-hint">{t("settings.split.hint")}</p>

      <div className="settings-pref-row settings-pref-row-block">
        <span className="settings-pref-label">{t("settings.split.granularity")}</span>
        <div className="settings-pill-group" role="radiogroup" aria-label={t("settings.split.granularity")}>
          {GRANULARITIES.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={prefs.granularity === g}
              className={`settings-pill${prefs.granularity === g ? " active" : ""}`}
              onClick={() => setPref({ granularity: g })}
            >
              {t(`settings.split.granularity.${g}`)}
            </button>
          ))}
        </div>
      </div>
      <p className="settings-section-hint">
        {t(`settings.split.granularityHint.${prefs.granularity}`)}
      </p>

      <div className="settings-pref-row">
        <span className="settings-pref-label">{t("settings.split.askFirst")}</span>
        <button
          className={`settings-toggle-btn${prefs.askFirst ? " active" : ""}`}
          onClick={() => setPref({ askFirst: !prefs.askFirst })}
          aria-pressed={prefs.askFirst}
        >
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
          {prefs.askFirst ? t("settings.prefs.on") : t("settings.prefs.off")}
        </button>
      </div>
      <p className="settings-section-hint">{t("settings.split.askFirstHint")}</p>

      <div className="settings-pref-row">
        <span className="settings-pref-label">{t("settings.split.guessDates")}</span>
        <button
          className={`settings-toggle-btn${prefs.guessDates ? " active" : ""}`}
          onClick={() => setPref({ guessDates: !prefs.guessDates })}
          aria-pressed={prefs.guessDates}
        >
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
          {prefs.guessDates ? t("settings.prefs.on") : t("settings.prefs.off")}
        </button>
      </div>
      <p className="settings-section-hint">{t("settings.split.guessDatesHint")}</p>

      <div className="settings-pref-row settings-pref-row-block">
        <span className="settings-pref-label">{t("settings.split.custom")}</span>
        <textarea
          className="settings-split-input"
          rows={3}
          maxLength={800}
          value={prefs.customRules}
          placeholder={t("settings.split.customPlaceholder")}
          onChange={(e) => setPref({ customRules: e.target.value })}
        />
      </div>
      <p className="settings-section-hint">{t("settings.split.customHint")}</p>

      <div className="settings-data-actions">
        <button type="button" className="settings-data-btn" onClick={reset}>
          {t("settings.split.reset")}
        </button>
      </div>
    </div>
  );
}
