import React from "react";
import ThemeSection from "./ThemeSection";
import PrefsSection from "./PrefsSection";
import DataSection from "./DataSection";
import "./Settings.css";

export default function SettingsPage() {
  return (
    <div className="page-settings">
      <div className="settings-headline">
        <h1>设置</h1>
      </div>
      <ThemeSection />
      <PrefsSection />
      <DataSection />
    </div>
  );
}
