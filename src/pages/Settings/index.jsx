import React from "react";
import ThemeSection from "./ThemeSection";
import TaskAttrsSection from "./TaskAttrsSection";
import PrefsSection from "./PrefsSection";
import DataSection from "./DataSection";
import "./Settings.css";
import "./AttrEditor.css";

export default function SettingsPage() {
  return (
    <div className="page-settings">
      <div className="settings-headline">
        <h1>设置</h1>
      </div>
      <ThemeSection />
      <div className="settings-section">
        <div className="settings-section-title">任务属性</div>
        <p className="settings-section-hint">
          管理任务库中显示的属性列，可编辑名称、类型和选项，或添加自定义属性。
        </p>
        <TaskAttrsSection />
      </div>
      <PrefsSection />
      <DataSection />
    </div>
  );
}
