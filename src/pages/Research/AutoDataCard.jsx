import React from "react";
import { formatDuration } from "@/utils/time";
import { useLanguage } from "@/context/LanguageContext";

// 系统自动计算的当日专注数据展示（只读）。
export default function AutoDataCard({ autoData, isToday }) {
  const { t } = useLanguage();
  const hasData =
    autoData.totalFocusDurationSecs > 0 || autoData.realtimeDistractionCount > 0;

  if (!hasData) {
    return (
      <div className="research-auto-empty">
        {isToday ? t("research.auto.emptyToday") : t("research.auto.emptyDay")}
      </div>
    );
  }

  return (
    <div className="research-auto-grid">
      <div className="research-auto-card">
        <div className="research-auto-value">
          {autoData.maxFocusDurationSecs > 0
            ? formatDuration(autoData.maxFocusDurationSecs)
            : "—"}
        </div>
        <div className="research-auto-label">{t("research.auto.maxFocus")}</div>
      </div>
      <div className="research-auto-card">
        <div className="research-auto-value">
          {autoData.totalFocusDurationSecs > 0
            ? formatDuration(autoData.totalFocusDurationSecs)
            : "—"}
        </div>
        <div className="research-auto-label">{t("research.auto.totalFocus")}</div>
      </div>
      <div className="research-auto-card">
        <div className="research-auto-value">{autoData.realtimeDistractionCount}</div>
        <div className="research-auto-label">{t("research.auto.distractions")}</div>
      </div>
      <div className="research-auto-card">
        <div className="research-auto-value">{autoData.taskCompletedCount}</div>
        <div className="research-auto-label">{t("research.auto.tasksDone")}</div>
      </div>
    </div>
  );
}
