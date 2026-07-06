import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import useTonePack from "@/hooks/character/useTonePack";

// 语气设置：输入一段 prompt（或点预设），AI 把角色卡/结算卡的整套质化文案
// 按该语气重写。无 key / 离线时回退示例语气包，链路照样跑通。
const PRESETS = ["healing", "rpg", "coach", "zen"];

// 预览用的代表性槽位
const PREVIEW_KEYS = [
  "character.stage.4",
  "character.grow.soon",
  "character.momentum.hot",
  "character.reward.grow.big",
];

export default function ToneSection() {
  const { t, lang } = useLanguage();
  const { tonePack, generating, error, generate, reset, isExampleMode } = useTonePack();
  const [draft, setDraft] = useState(tonePack?.prompt ?? "");

  const canGen = draft.trim().length > 0 && !generating;
  const resolve = (key) => tonePack?.phrases?.[key] ?? t(key);

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.tone.title")}</div>
      <p className="settings-section-hint">{t("settings.tone.hint")}</p>

      {/* 预设语气：点一下填入输入框 */}
      <div className="settings-tone-presets">
        {PRESETS.map((k) => (
          <button
            key={k}
            type="button"
            className="settings-pill"
            onClick={() => setDraft(t(`settings.tone.presetText.${k}`))}
          >
            {t(`settings.tone.preset.${k}`)}
          </button>
        ))}
      </div>

      <textarea
        className="settings-tone-input"
        rows={3}
        value={draft}
        placeholder={t("settings.tone.placeholder")}
        onChange={(e) => setDraft(e.target.value)}
      />

      <div className="settings-data-actions">
        <button
          type="button"
          className="settings-data-btn"
          disabled={!canGen}
          onClick={() => generate(draft, lang)}
        >
          {generating ? t("settings.tone.generating") : t("settings.tone.generate")}
        </button>
        {tonePack && (
          <button
            type="button"
            className="settings-data-btn"
            disabled={generating}
            onClick={() => {
              reset();
              setDraft("");
            }}
          >
            {t("settings.tone.reset")}
          </button>
        )}
      </div>

      {isExampleMode && (
        <p className="settings-section-hint">{t("settings.tone.exampleNote")}</p>
      )}
      {error && <p className="settings-import-msg error">{t("settings.tone.error")}</p>}

      {/* 生成结果预览 */}
      {tonePack && (
        <div className="settings-tone-preview">
          <div className="settings-tone-preview-head">
            <span className="settings-tone-preview-title">{t("settings.tone.previewTitle")}</span>
            <span className="settings-tone-badge">
              {tonePack.mode === "example"
                ? t("settings.tone.modeExample")
                : t("settings.tone.modeAi")}
            </span>
          </div>
          <ul className="settings-tone-preview-list">
            {PREVIEW_KEYS.map((k) => (
              <li key={k}>{resolve(k)}</li>
            ))}
            <li>{resolve("character.reward.levelUp").replace("{rank}", t("character.stage.4"))}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
