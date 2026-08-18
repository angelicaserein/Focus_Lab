import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSection from "@/pages/Settings/LanguageSection";
import ThemeSection from "@/pages/Settings/ThemeSection";
import PrefsSection from "@/pages/Settings/PrefsSection";
import AppWatchSection from "@/pages/Settings/AppWatchSection";
import ToneSection from "@/pages/Settings/ToneSection";
import TaskSplitSection from "@/pages/Settings/TaskSplitSection";
import DataSection from "@/pages/Settings/DataSection";
import PrivacySection from "@/pages/Settings/PrivacySection";
import "./Settings.css";

const TABS = ["appearance", "timing", "tasks", "tone", "language", "data", "privacy"];

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
        {tab === "timing" && (
          <>
            <PrefsSection group="timing" />
            {/* 桌面版限定，网页版下这个组件自己返回 null */}
            <AppWatchSection />
          </>
        )}
        {tab === "tasks" && <TaskSplitSection />}
        {tab === "tone" && <ToneSection />}
        {tab === "language" && <LanguageSection />}
        {tab === "data" && <DataSection />}
        {tab === "privacy" && <PrivacySection />}
      </div>
    </div>
  );
}
