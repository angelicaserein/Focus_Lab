import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";

export default function LanguageSection() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.lang.title")}</div>
      <p className="settings-section-hint">{t("settings.lang.hint")}</p>
      <div className="settings-pill-group">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            className={`settings-pill${lang === l.id ? " active" : ""}`}
            onClick={() => setLang(l.id)}
            aria-pressed={lang === l.id}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
