import React, { useState } from "react";
import { Link } from "react-router-dom";
import useScenarioAnalytics from "@/hooks/scenario/useScenarioAnalytics";
import { formatDuration, formatRelativeTime } from "@/utils/time";
import "../History/History.css";
import "./ScenarioStats.css";

export default function ScenarioStatsPage() {
  const { rows, totals } = useScenarioAnalytics();
  const [activeId, setActiveId] = useState(null);

  if (rows.length === 0) {
    return (
      <div className="scs-page">
        <div className="scs-header">
          <h1>情景统计</h1>
          <Link to="/scenario" className="scs-back-link">← 情景列表</Link>
        </div>
        <div className="hist-empty">
          还没有任何情景专注记录。<br />
          去开始一次专注吧！
        </div>
      </div>
    );
  }

  return (
    <div className="scs-page">
      <div className="scs-header">
        <h1>情景统计</h1>
        <Link to="/scenario" className="scs-back-link">← 情景列表</Link>
      </div>

      {/* 汇总卡片 */}
      <div className="hist-stats">
        <div className="hist-stat-card accent">
          <div className="hist-stat-value">{formatDuration(totals.secs)}</div>
          <div className="hist-stat-label">情景累计时长</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">{totals.sessions}</div>
          <div className="hist-stat-label">情景专注次数</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">{totals.scenarioCount}</div>
          <div className="hist-stat-label">使用过的情景</div>
        </div>
      </div>

      {/* 情景排行 */}
      <div className="scs-ranking">
        <div className="scs-ranking-header">
          <span>情景</span>
          <span>次数</span>
          <span>时长</span>
          <span>上次使用</span>
        </div>
        {rows.map((row) => {
          const isOpen = activeId === row.id;
          const chartMax = Math.max(...row.chartData.map((d) => d.totalSecs), 1);
          const taskMax = row.topTasks.length > 0 ? row.topTasks[0].totalSecs : 1;

          return (
            <div key={row.id} className="scs-row-wrap">
              <button
                className={`scs-row${isOpen ? " open" : ""}`}
                onClick={() => setActiveId(isOpen ? null : row.id)}
                aria-expanded={isOpen}
              >
                <span className="scs-row-title">
                  <span className="scs-chevron">{isOpen ? "▾" : "▸"}</span>
                  {row.title}
                </span>
                <span className="scs-row-sessions">{row.sessions}次</span>
                <span className="scs-row-dur">{formatDuration(row.secs)}</span>
                <span className="scs-row-last">{formatRelativeTime(row.lastUsed)}</span>
              </button>

              {isOpen && (
                <div className="scs-detail">
                  {/* 7日趋势 */}
                  <div className="scs-detail-section">
                    <div className="hist-section-title">近 7 天</div>
                    <div className="hist-chart scs-mini-chart">
                      {row.chartData.map((d) => (
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

                  {/* 常用任务 */}
                  {row.topTasks.length > 0 && (
                    <div className="scs-detail-section">
                      <div className="hist-section-title">常用任务</div>
                      <div className="hist-task-breakdown scs-tasks">
                        {row.topTasks.map((t, i) => (
                          <div key={t.text} className="hist-task-row">
                            <div className="hist-task-meta">
                              <span className="hist-task-rank">#{i + 1}</span>
                              <span className="hist-task-name">{t.text}</span>
                              <span className="hist-task-sessions">{t.count} 次</span>
                              <span className="hist-task-dur">{formatDuration(t.totalSecs)}</span>
                            </div>
                            <div className="hist-task-track">
                              <div
                                className="hist-task-bar"
                                style={{ width: `${(t.totalSecs / taskMax) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
