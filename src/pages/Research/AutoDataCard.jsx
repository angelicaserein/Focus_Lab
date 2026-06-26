import React from "react";
import { formatDuration } from "../../utils/time";

// 系统自动计算的当日专注数据展示（只读）。
export default function AutoDataCard({ autoData, isToday }) {
  const hasData =
    autoData.totalFocusDurationSecs > 0 || autoData.realtimeDistractionCount > 0;

  if (!hasData) {
    return (
      <div className="research-auto-empty">
        {isToday
          ? "今日暂无专注记录，完成专注后数据将自动显示"
          : "该日期无专注记录"}
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
        <div className="research-auto-label">最大专注时长</div>
      </div>
      <div className="research-auto-card">
        <div className="research-auto-value">
          {autoData.totalFocusDurationSecs > 0
            ? formatDuration(autoData.totalFocusDurationSecs)
            : "—"}
        </div>
        <div className="research-auto-label">今日总专注时长</div>
      </div>
      <div className="research-auto-card">
        <div className="research-auto-value">{autoData.realtimeDistractionCount}</div>
        <div className="research-auto-label">实时分心次数</div>
      </div>
      <div className="research-auto-card">
        <div className="research-auto-value">{autoData.taskCompletedCount}</div>
        <div className="research-auto-label">任务完成数</div>
      </div>
    </div>
  );
}
