import React from "react";
import { formatDuration } from "../../utils/time";

// 顶部统计区：两行汇总卡 + 近 7 天柱状图 + 任务专注排行。
// 入参 stats 为 computeFocusStats(records) 的结果。
export default function StatsOverview({ stats }) {
  const {
    totalSecs,
    todaySecs,
    sessionCount,
    longestSecs,
    avgSecs,
    taskBreakdown,
    chartData,
  } = stats;

  const chartMax = Math.max(...chartData.map((d) => d.totalSecs), 1);
  const taskBreakdownMax = taskBreakdown.length > 0 ? taskBreakdown[0].totalSecs : 1;

  return (
    <>
      {/* Stats cards — row 1 */}
      <div className="hist-stats">
        <div className="hist-stat-card">
          <div className="hist-stat-value">{sessionCount}</div>
          <div className="hist-stat-label">累计专注次数</div>
        </div>
        <div className="hist-stat-card accent">
          <div className="hist-stat-value">{formatDuration(totalSecs)}</div>
          <div className="hist-stat-label">累计专注时长</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">{formatDuration(todaySecs)}</div>
          <div className="hist-stat-label">今日专注时长</div>
        </div>
      </div>

      {/* Stats cards — row 2 */}
      <div className="hist-stats hist-stats-row2">
        <div className="hist-stat-card">
          <div className="hist-stat-value">
            {longestSecs > 0 ? formatDuration(longestSecs) : "—"}
          </div>
          <div className="hist-stat-label">最长单次专注</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">
            {avgSecs > 0 ? formatDuration(avgSecs) : "—"}
          </div>
          <div className="hist-stat-label">平均专注时长</div>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div className="hist-section">
        <div className="hist-section-title">近 7 天专注时长</div>
        <div className="hist-chart">
          {chartData.map((d) => (
            <div key={d.label} className="hist-bar-col">
              <div className="hist-bar-top-val">
                {d.totalSecs > 0 ? formatDuration(d.totalSecs) : ""}
              </div>
              <div className="hist-bar-wrap">
                <div
                  className="hist-bar-fill"
                  style={{ height: `${(d.totalSecs / chartMax) * 100}%` }}
                />
              </div>
              <div className="hist-bar-label">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task breakdown */}
      {taskBreakdown.length > 0 && (
        <div className="hist-section">
          <div className="hist-section-title">任务专注排行</div>
          <div className="hist-task-breakdown">
            {taskBreakdown.map((t, i) => (
              <div key={t.text} className="hist-task-row">
                <div className="hist-task-meta">
                  <span className="hist-task-rank">#{i + 1}</span>
                  <span className="hist-task-name">{t.text}</span>
                  <span className="hist-task-sessions">{t.sessions} 次</span>
                  <span className="hist-task-dur">{formatDuration(t.totalSecs)}</span>
                </div>
                <div className="hist-task-track">
                  <div
                    className="hist-task-bar"
                    style={{ width: `${(t.totalSecs / taskBreakdownMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
