import React, { useState } from "react";
import { Link } from "react-router-dom";
import useScenarioAnalytics from "@/hooks/scenario/useScenarioAnalytics";
import { useLanguage } from "@/context/LanguageContext";
import { formatDuration, formatRelativeTime } from "@/utils/time";
import "@/components/records/records.css";
import "./ScenarioStats.css";

export default function ScenarioStatsPage() {
  const { rows, totals } = useScenarioAnalytics();
  const { t, lang } = useLanguage();
  const [activeId, setActiveId] = useState(null);

  if (rows.length === 0) {
    return (
      <div className="scs-page">
        <div className="scs-header">
          <h1>{t("scenarioStats.title")}</h1>
          <Link to="/scenario" className="scs-back-link">{t("scenarioStats.back")}</Link>
        </div>
        <div className="hist-empty">
          {t("scenarioStats.empty")}<br />
          {t("scenarioStats.emptyHint")}
        </div>
      </div>
    );
  }

  return (
    <div className="scs-page">
      <div className="scs-header">
        <h1>{t("scenarioStats.title")}</h1>
        <Link to="/scenario" className="scs-back-link">{t("scenarioStats.back")}</Link>
      </div>

      {/* 汇总卡片 */}
      <div className="hist-stats">
        <div className="hist-stat-card accent">
          <div className="hist-stat-value">{formatDuration(totals.secs)}</div>
          <div className="hist-stat-label">{t("scenarioStats.totalSecs")}</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">{totals.sessions}</div>
          <div className="hist-stat-label">{t("scenarioStats.totalSessions")}</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">{totals.scenarioCount}</div>
          <div className="hist-stat-label">{t("scenarioStats.scenarioCount")}</div>
        </div>
      </div>

      {/* 情景排行 */}
      <div className="scs-ranking">
        <div className="scs-ranking-header">
          <span>{t("scenarioStats.colScenario")}</span>
          <span>{t("scenarioStats.colSessions")}</span>
          <span>{t("scenarioStats.colDuration")}</span>
          <span>{t("scenarioStats.colLastUsed")}</span>
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
                  {row.titleKey ? t(row.titleKey) : row.title}
                </span>
                <span className="scs-row-sessions">
                  {t("scenarioStats.sessionCount", { count: row.sessions })}
                </span>
                <span className="scs-row-dur">{formatDuration(row.secs)}</span>
                <span className="scs-row-last">{formatRelativeTime(row.lastUsed, lang)}</span>
              </button>

              {isOpen && (
                <div className="scs-detail">
                  {/* 7日趋势 */}
                  <div className="scs-detail-section">
                    <div className="hist-section-title">{t("scenarioStats.last7Days")}</div>
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
                          <div className="hist-bar-label">
                            {d.isToday ? t("common.today") : d.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 常用任务 */}
                  {row.topTasks.length > 0 && (
                    <div className="scs-detail-section">
                      <div className="hist-section-title">{t("scenarioStats.topTasks")}</div>
                      <div className="hist-task-breakdown scs-tasks">
                        {row.topTasks.map((task, i) => (
                          <div key={task.text} className="hist-task-row">
                            <div className="hist-task-meta">
                              <span className="hist-task-rank">#{i + 1}</span>
                              <span className="hist-task-name">
                                {task.text || t("analytics.untitled")}
                              </span>
                              <span className="hist-task-sessions">
                                {t("scenarioStats.taskCount", { count: task.count })}
                              </span>
                              <span className="hist-task-dur">{formatDuration(task.totalSecs)}</span>
                            </div>
                            <div className="hist-task-track">
                              <div
                                className="hist-task-bar"
                                style={{ width: `${(task.totalSecs / taskMax) * 100}%` }}
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
