import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSection from "@/pages/Settings/LanguageSection";
import ThemeSection from "@/pages/Settings/ThemeSection";
import PrefsSection from "@/pages/Settings/PrefsSection";
import ToneSection from "@/pages/Settings/ToneSection";
import DataSection from "@/pages/Settings/DataSection";
import "./Settings.css";

const TABS = ["appearance", "timing", "tone", "language", "data"];

export default function SettingsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("appearance");

  return (
    <div className="page-settings">
      <div className="settings-header">
        <div className="settings-headline">
          <h1>{t("settings.title")}</h1>
        </div>
        <div className="settings-tabs" role="tablist" aria-label={t("settings.title")}>
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`settings-tab${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {t(`settings.tab.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-tabpanel" role="tabpanel">
        {tab === "appearance" && (
          <>
            <ThemeSection />
            <PrefsSection group="appearance" />
          </>
        )}
        {tab === "timing" && <PrefsSection group="timing" />}
        {tab === "tone" && <ToneSection />}
        {tab === "language" && <LanguageSection />}
        {tab === "data" && <DataSection />}
      </div>
    </div>
  );
}
