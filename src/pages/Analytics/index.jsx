import React from "react";
import { Link } from "react-router-dom";
import useFocusAnalytics from "@/hooks/focus/useFocusAnalytics";
import { useFeatures } from "@/context/FeatureContext";
import { formatDurationChinese as fmt } from "@/utils/time";
import "./Analytics.css";

// 只在关键刻度显示小时标签
const HOUR_TICK = { 0: "0时", 6: "6时", 12: "12时", 18: "18时", 23: "23时" };

function SectionHead({ title, badge }) {
  return (
    <div className="ana-section-hd">
      <span className="ana-section-title">{title}</span>
      {badge && <span className="ana-insight-badge">{badge}</span>}
    </div>
  );
}

// 24 小时条形图：专注高峰与分心高峰两处共用，仅取值/标题/条形样式不同。
function HourlyBars({ data, getValue, max, barClassName, formatTitle }) {
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
            <span className="ana-hour-label">{HOUR_TICK[d.hour] ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const {
    focusRecords,
    hourly,
    blocks,
    durationBuckets,
    difficulty,
    distData,
    sessionCount,
    avgSessionSecs,
  } = useFocusAnalytics();
  const { isEnabled } = useFeatures();

  // ── 衍生值 ───────────────────────────────────────────────────────────────
  const hourlyMax = Math.max(...hourly.map((h) => h.totalSecs), 1);
  const durationMax = Math.max(...durationBuckets.map((b) => b.count), 1);
  const bestBlock = blocks[0];
  const peakDistHour = distData.hourly.reduce(
    (best, h) => (h.count > best.count ? h : best),
    { hour: -1, count: 0 },
  );

  // ── 空状态 ────────────────────────────────────────────────────────────────
  if (focusRecords.length === 0) {
    return (
      <div className="page-analytics">
        <div className="ana-headline">
          <h1>数据分析</h1>
        </div>
        <div className="hist-empty">
          还没有专注记录。
          <br />
          先去完成几次专注，这里就会出现洞察！
        </div>
      </div>
    );
  }

  return (
    <div className="page-analytics">
      {/* ── 页头 ─────────────────────────────────────────────────────────── */}
      <div className="ana-headline">
        <h1>数据分析</h1>
        <p>
          共 {sessionCount} 次专注，平均每次 {fmt(avgSessionSecs)}
        </p>
      </div>

      {/* ── 1. 专注高峰时段 ───────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title="专注高峰时段"
          badge={bestBlock ? `${bestBlock.label}专注最多` : null}
        />

        {/* 24 小时条形图 */}
        <HourlyBars
          data={hourly}
          getValue={(h) => h.totalSecs}
          max={hourlyMax}
          barClassName="ana-hour-bar"
          formatTitle={(h) => `${h.hour}:00 — ${fmt(h.totalSecs)}`}
        />

        {/* 时间段卡片（最多 4 个，按时长排序） */}
        {blocks.length > 0 && (
          <div className="ana-blocks-row">
            {blocks.slice(0, 4).map((b, i) => (
              <div key={b.label} className={`ana-block-card${i === 0 ? " best" : ""}`}>
                <div className="ana-block-name">{b.label}</div>
                <div className="ana-block-secs">{fmt(b.totalSecs)}</div>
                <div className="ana-block-rate">
                  完成率 {Math.round(b.completionRate * 100)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 2. 专注时长分布 ───────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title="每次专注多久"
          badge={`平均 ${fmt(avgSessionSecs)}`}
        />

        <div className="ana-card ana-dur-list">
          {durationBuckets.map((b, i) => (
            <div key={i} className="ana-dur-row">
              <span className="ana-dur-label">{b.label}</span>
              <div className="ana-dur-track">
                {b.count > 0 && (
                  <div
                    className="ana-dur-fill"
                    style={{ width: `${(b.count / durationMax) * 100}%` }}
                  />
                )}
              </div>
              <span className="ana-dur-count">{b.count} 次</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. 任务难度 ───────────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title="哪些任务最难坚持"
          badge={
            difficulty.length > 0
              ? `${difficulty[0].text.length > 8 ? difficulty[0].text.slice(0, 8) + "…" : difficulty[0].text} 最难`
              : null
          }
        />

        {difficulty.length === 0 ? (
          <div className="ana-empty-tip">
            同一任务出现 2 次以上才会统计
          </div>
        ) : (
          <div className="ana-card ana-task-list">
            {difficulty.map((t, i) => (
              <div key={t.text} className="ana-task-row">
                <div className="ana-task-top">
                  <span className="ana-task-rank">#{i + 1}</span>
                  <span className="ana-task-name">{t.text}</span>
                  <span className={`ana-task-rate${t.failRate > 0.5 ? " hard" : ""}`}>
                    完成 {Math.round((1 - t.failRate) * 100)}%
                  </span>
                </div>
                <div className="ana-task-track">
                  <div
                    className={`ana-task-fill${t.failRate > 0.5 ? " hard" : ""}`}
                    style={{ width: `${Math.max((1 - t.failRate) * 100, 4)}%` }}
                  />
                </div>
                <div className="ana-task-sub">
                  共 {t.total} 次 · 完成 {t.completed} 次
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 4. 分心 —— 详细统计在 /distraction，这里只留一句概览 + 入口 ────── */}
      {isEnabled("/distraction") && distData.total > 0 && (
        <section className="ana-section">
          <SectionHead
            title="分心"
            badge={peakDistHour.count > 0 ? `${peakDistHour.hour}时最易分心` : null}
          />
          <Link to="/distraction" className="ana-insight-row ana-crosslink">
            共记录 <strong>{distData.total}</strong> 次分心
            {distData.topTag && (
              <>
                {" "}· 最常见原因 <strong>{distData.topTag}</strong>
              </>
            )}
            {" "}· 看分心统计 →
          </Link>
        </section>
      )}
    </div>
  );
}
