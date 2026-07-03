import React from "react";
import useFocusAnalytics from "@/hooks/focus/useFocusAnalytics";
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

  // ── 衍生值 ───────────────────────────────────────────────────────────────
  const hourlyMax = Math.max(...hourly.map((h) => h.totalSecs), 1);
  const durationMax = Math.max(...durationBuckets.map((b) => b.count), 1);
  const distMax = Math.max(...distData.hourly.map((h) => h.count), 1);
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
        <div className="ana-hourly-wrap">
          {hourly.map((h) => (
            <div key={h.hour} className="ana-hour-col">
              <div className="ana-hour-bar-wrap">
                {h.totalSecs > 0 && (
                  <div
                    className="ana-hour-bar"
                    style={{ height: `${(h.totalSecs / hourlyMax) * 100}%` }}
                    title={`${h.hour}:00 — ${fmt(h.totalSecs)}`}
                  />
                )}
              </div>
              <span className="ana-hour-label">{HOUR_TICK[h.hour] ?? ""}</span>
            </div>
          ))}
        </div>

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

      {/* ── 4. 分心高峰 ───────────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title="分心高峰时段"
          badge={
            peakDistHour.count > 0
              ? `${peakDistHour.hour}时最易分心`
              : null
          }
        />

        {distData.total === 0 ? (
          <div className="ana-empty-tip">还没有分心记录</div>
        ) : (
          <>
            <div className="ana-hourly-wrap">
              {distData.hourly.map((h) => (
                <div key={h.hour} className="ana-hour-col">
                  <div className="ana-hour-bar-wrap">
                    {h.count > 0 && (
                      <div
                        className="ana-hour-bar distraction"
                        style={{ height: `${(h.count / distMax) * 100}%` }}
                        title={`${h.hour}:00 — ${h.count} 次分心`}
                      />
                    )}
                  </div>
                  <span className="ana-hour-label">{HOUR_TICK[h.hour] ?? ""}</span>
                </div>
              ))}
            </div>

            {distData.topTag && (
              <div className="ana-insight-row">
                最常见分心原因：<strong>{distData.topTag}</strong>
                {" "}· 共记录 {distData.total} 次分心
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
