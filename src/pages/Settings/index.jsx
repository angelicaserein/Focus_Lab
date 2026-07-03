import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSection from "@/pages/Settings/LanguageSection";
import ThemeSection from "@/pages/Settings/ThemeSection";
import PrefsSection from "@/pages/Settings/PrefsSection";
import DataSection from "@/pages/Settings/DataSection";
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
