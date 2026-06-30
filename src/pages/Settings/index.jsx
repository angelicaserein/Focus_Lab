import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSection from "./LanguageSection";
import ThemeSection from "./ThemeSection";
import PrefsSection from "./PrefsSection";
import DataSection from "./DataSection";
import "./Settings.css";

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <div className="page-settings">
      <div className="settings-headline">
        <h1>{t("settings.title")}</h1>
      </div>
      <LanguageSection />
      <ThemeSection />
      <PrefsSection />
      <DataSection />
    </div>
  );
}
