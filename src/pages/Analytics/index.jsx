import React from "react";
import { Link } from "react-router-dom";
import useFocusAnalytics from "@/hooks/focus/useFocusAnalytics";
import { useFeatures } from "@/context/FeatureContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDurationChinese, formatDuration } from "@/utils/time";
import FocusSummary from "./FocusSummary";
import "./Analytics.css";

// 只在关键刻度显示小时标签
const HOUR_TICKS = [0, 6, 12, 18, 23];

// 页尾出口：本页给全局结论，更细的东西各有专页。
const MORE_PAGES = [
  { to: "/distraction", labelKey: "nav.distraction" },
  { to: "/scenario-stats", labelKey: "nav.scenarioStats" },
  { to: "/calendar", labelKey: "nav.calendar" },
];

function SectionHead({ title, badge }) {
  return (
    <div className="ana-section-hd">
      <span className="ana-section-title">{title}</span>
      {badge && <span className="ana-insight-badge">{badge}</span>}
    </div>
  );
}

// 24 小时条形图：专注高峰与分心高峰两处共用，仅取值/标题/条形样式不同。
function HourlyBars({ data, getValue, max, barClassName, formatTitle, hourLabel }) {
  return (
    <div className="ana-hourly-wrap">
      {data.map((d) => {
        const value = getValue(d);
        return (
          <div key={d.hour} className="ana-hour-col">
            <div className="ana-hour-bar-wrap">
              {value > 0 && (
                <div
                  className={barClassName}
                  style={{ height: `${(value / max) * 100}%` }}
                  title={formatTitle(d)}
                />
              )}
            </div>
            <span className="ana-hour-label">
              {HOUR_TICKS.includes(d.hour) ? hourLabel(d.hour) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 数据分析 = 全部汇总数字与图表的唯一去处。
// 记录原文在 /calendar，分心细节在 /distraction，这里都不再摆一份摘要。
export default function AnalyticsPage() {
  const {
    focusRecords,
    hourly,
    blocks,
    durationBuckets,
    taskTable,
    stats,
    avgSessionSecs,
  } = useFocusAnalytics();
  const { isEnabled } = useFeatures();
  const { t, lang } = useLanguage();

  const fmt = (secs) => formatDurationChinese(secs, lang);
  const hourLabel = (hour) => t("analytics.hourTick", { hour });
  const moreLinks = MORE_PAGES.filter((p) => isEnabled(p.to));

  // ── 衍生值 ───────────────────────────────────────────────────────────────
  const hourlyMax = Math.max(...hourly.map((h) => h.totalSecs), 1);
  const durationMax = Math.max(...durationBuckets.map((b) => b.count), 1);
  const bestBlock = blocks[0];
  const taskMax = taskTable[0]?.totalSecs ?? 1;
  const taskName = (text) => text || t("analytics.untitled");

  // ── 空状态 ────────────────────────────────────────────────────────────────
  if (focusRecords.length === 0) {
    return (
      <div className="page-analytics">
        <div className="ana-headline">
          <h1>{t("analytics.title")}</h1>
        </div>
        <div className="ana-empty">
          {t("analytics.empty")}
          <br />
          {t("analytics.emptyHint")}
        </div>
      </div>
    );
  }

  return (
    <div className="page-analytics">
      {/* ── 页头 ─────────────────────────────────────────────────────────── */}
      <div className="ana-headline">
        <h1>{t("analytics.title")}</h1>
        <p>{t("analytics.subtitle")}</p>
      </div>

      {/* ── 0. 结论区：一张主卡 + 近 7 天趋势 ─────────────────────────────── */}
      <FocusSummary stats={stats} />

      {/* ── 1. 专注高峰时段 ───────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title={t("analytics.peak.title")}
          badge={
            bestBlock
              ? t("analytics.peak.badge", { block: t(bestBlock.labelKey) })
              : null
          }
        />

        {/* 24 小时条形图 */}
        <HourlyBars
          data={hourly}
          getValue={(h) => h.totalSecs}
          max={hourlyMax}
          barClassName="ana-hour-bar"
          formatTitle={(h) => `${h.hour}:00 — ${fmt(h.totalSecs)}`}
          hourLabel={hourLabel}
        />

        {/* 时间段卡片（最多 4 个，按时长排序） */}
        {blocks.length > 0 && (
          <div className="ana-blocks-row">
            {blocks.slice(0, 4).map((b, i) => (
              <div key={b.labelKey} className={`ana-block-card${i === 0 ? " best" : ""}`}>
                <div className="ana-block-name">{t(b.labelKey)}</div>
                <div className="ana-block-secs">{fmt(b.totalSecs)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 2. 专注时长分布 ───────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title={t("analytics.duration.title")}
          badge={t("analytics.duration.badge", { avg: fmt(avgSessionSecs) })}
        />

        <div className="ana-card ana-dur-list">
          {durationBuckets.map((b, i) => (
            <div key={i} className="ana-dur-row">
              <span className="ana-dur-label">{t(b.labelKey)}</span>
              <div className="ana-dur-track">
                {b.count > 0 && (
                  <div
                    className="ana-dur-fill"
                    style={{ width: `${(b.count / durationMax) * 100}%` }}
                  />
                )}
              </div>
              <span className="ana-dur-count">
                {t("analytics.duration.count", { count: b.count })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. 任务：按投入时长排的一张表 ─────────────────────────────────── */}
      {taskTable.length > 0 && (
        <section className="ana-section">
          <SectionHead
            title={t("analytics.tasks.title")}
            badge={t("analytics.tasks.badge", {
              task: (() => {
                const name = taskName(taskTable[0].text);
                return name.length > 8 ? name.slice(0, 8) + "…" : name;
              })(),
            })}
          />

          <div className="ana-card ana-task-list">
            {taskTable.map((task, i) => (
              <div key={task.text} className="ana-task-row">
                <div className="ana-task-top">
                  <span className="ana-task-rank">#{i + 1}</span>
                  <span className="ana-task-name">{taskName(task.text)}</span>
                </div>
                {/* 条形长度看的是投入时长，也是这张表的排序依据 */}
                <div className="ana-task-track">
                  <div
                    className="ana-task-fill"
                    style={{ width: `${Math.max((task.totalSecs / taskMax) * 100, 4)}%` }}
                  />
                </div>
                <div className="ana-task-sub">
                  {t("analytics.tasks.sub", {
                    duration: formatDuration(task.totalSecs),
                    count: task.sessions,
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 页尾：去更细的地方 ─────────────────────────────────────────────
          这里是全局分析，细节各有专页。摘要不再往本页塞（那正是从前乱的原因），
          只留一排出口；被功能树关掉的页不出现。 */}
      {moreLinks.length > 0 && (
        <nav className="ana-more">
          <span className="ana-more-label">{t("analytics.more")}</span>
          <div className="ana-more-links">
            {moreLinks.map(({ to, labelKey }) => (
              <Link key={to} to={to} className="ana-more-link">
                {t(labelKey)}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
