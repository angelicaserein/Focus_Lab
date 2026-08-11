import React from "react";
import useDistractionAnalytics from "@/hooks/focus/useDistractionAnalytics";
import { useLanguage } from "@/context/LanguageContext";
import { UNTAGGED } from "@/utils/analytics/distractionStats";
import { formatTimestamp, formatSessionDate, formatDuration } from "@/utils/time";
import "../History/History.css";
import "../History/SessionSummary.css";
import "../Analytics/Analytics.css";
import "./Distraction.css";

// 只在关键刻度显示小时标签（与数据分析页一致）
const HOUR_TICK = { 0: "0时", 6: "6时", 12: "12时", 18: "18时", 23: "23时" };

function SectionHead({ title, badge }) {
  return (
    <div className="ana-section-hd">
      <span className="ana-section-title">{title}</span>
      {badge && <span className="ana-insight-badge">{badge}</span>}
    </div>
  );
}

export default function DistractionPage() {
  const { overview, hourly, tagRanking, trend, sessions } = useDistractionAnalytics();
  const { t, lang } = useLanguage();

  if (overview.total === 0) {
    return (
      <div className="page-distraction">
        <div className="ana-headline">
          <h1>{t("distraction.title")}</h1>
        </div>
        <div className="hist-empty dst-empty">{t("distraction.empty")}</div>
      </div>
    );
  }

  const hourMax = Math.max(...hourly.hourly.map((h) => h.count), 1);
  const peakHour = hourly.hourly.reduce(
    (best, h) => (h.count > best.count ? h : best),
    { hour: -1, count: 0 },
  );
  const trendMax = Math.max(...trend.map((d) => d.count), 1);
  const trendTotal = trend.reduce((s, d) => s + d.count, 0);
  const tagMax = tagRanking[0]?.count ?? 1;
  const tagLabel = (tag) => (tag === UNTAGGED ? t("distraction.reasons.untagged") : tag);

  return (
    <div className="page-distraction">
      {/* ── 页头 ───────────────────────────────────────────────────────────── */}
      <div className="ana-headline">
        <h1>{t("distraction.title")}</h1>
        <p>
          {t("distraction.subtitle", {
            total: overview.total,
            sessions: overview.sessionCount,
          })}
        </p>
      </div>

      {/* ── 1. 总览数字 ───────────────────────────────────────────────────── */}
      <div className="hist-stats dst-stats">
        <div className="hist-stat-card accent">
          <div className="hist-stat-value">{overview.total}</div>
          <div className="hist-stat-label">{t("distraction.stat.total")}</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">
            {overview.ratePerHour !== null
              ? overview.ratePerHour.toFixed(1)
              : t("distraction.stat.noRate")}
          </div>
          <div className="hist-stat-label">{t("distraction.stat.rate")}</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">{overview.avgPerSession.toFixed(1)}</div>
          <div className="hist-stat-label">{t("distraction.stat.avg")}</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">
            {t("distraction.stat.times", { n: overview.proactiveCount })}
          </div>
          <div className="hist-stat-label">
            {t("distraction.stat.proactive")}
            {overview.proactiveSecs > 0 && ` · ${formatDuration(overview.proactiveSecs)}`}
          </div>
        </div>
        {/* 桌面端才会有的一张：没装桌面版的话这栏永远是 0，不如不占地方 */}
        {overview.appCount > 0 && (
          <div className="hist-stat-card">
            <div className="hist-stat-value">
              {t("distraction.stat.times", { n: overview.appCount })}
            </div>
            <div className="hist-stat-label">
              {t("distraction.stat.away")}
              {overview.appSecs > 0 && ` · ${formatDuration(overview.appSecs)}`}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. 近 7 天趋势 ────────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title={t("distraction.trend.title")}
          badge={t("distraction.trend.badge", { n: trendTotal })}
        />
        <div className="hist-chart dst-trend-chart">
          {trend.map((d) => (
            <div key={d.ts} className="hist-bar-col">
              <div className="hist-bar-top-val">{d.count > 0 ? d.count : ""}</div>
              <div className="hist-bar-wrap">
                <div
                  className="hist-bar-fill dst-bar"
                  style={{ height: `${(d.count / trendMax) * 100}%` }}
                />
              </div>
              <div className="hist-bar-label">{d.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. 分心高峰时段 ───────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title={t("distraction.peak.title")}
          badge={
            peakHour.count > 0
              ? t("distraction.peak.badge", { hour: peakHour.hour })
              : null
          }
        />
        <div className="ana-hourly-wrap">
          {hourly.hourly.map((h) => (
            <div key={h.hour} className="ana-hour-col">
              <div className="ana-hour-bar-wrap">
                {h.count > 0 && (
                  <div
                    className="ana-hour-bar distraction"
                    style={{ height: `${(h.count / hourMax) * 100}%` }}
                    title={t("distraction.peak.tooltip", { hour: h.hour, n: h.count })}
                  />
                )}
              </div>
              <span className="ana-hour-label">{HOUR_TICK[h.hour] ?? ""}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. 分心原因排行 ───────────────────────────────────────────────── */}
      <section className="ana-section">
        <SectionHead
          title={t("distraction.reasons.title")}
          badge={
            hourly.topTag ? t("distraction.reasons.badge", { tag: hourly.topTag }) : null
          }
        />
        <div className="ana-card ana-dur-list">
          {tagRanking.map((row) => (
            <div key={row.tag} className="ana-dur-row">
              <span
                className={`ana-dur-label dst-tag-label${row.tag === UNTAGGED ? " untagged" : ""}`}
              >
                {tagLabel(row.tag)}
              </span>
              <div className="ana-dur-track">
                <div
                  className="ana-dur-fill dst-bar"
                  style={{ width: `${(row.count / tagMax) * 100}%` }}
                />
              </div>
              <span className="ana-dur-count dst-count">
                {t("distraction.stat.times", { n: row.count })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. 按会话明细（原先挤在历史页里的那份） ───────────────────────── */}
      <section className="ana-section">
        <SectionHead title={t("distraction.sessions.title")} />
        <div className="session-summary dst-sessions">
          <div className="session-summary-scroll">
            {sessions.map((session) => (
              <div key={session.firstTs} className="session-summary-group">
                <div className="session-summary-group-hd">
                  <span className="session-summary-date">
                    {formatSessionDate(session.firstTs, lang)}
                  </span>
                  <span className="session-stat distraction">⚡ {session.items.length}</span>
                </div>

                <div className="distraction-insight-row">
                  {session.distractionRate && (
                    <span className="distraction-insight-item">
                      {t("history.distractPerHour", { rate: session.distractionRate })}
                    </span>
                  )}
                  {session.bestTag && (
                    <span className="distraction-insight-item tag">
                      {t("history.mostly", { tag: session.bestTag })}
                    </span>
                  )}
                  {session.diffVsPrev !== null && (
                    <span
                      className={`distraction-insight-item diff${session.diffVsPrev < 0 ? " better" : session.diffVsPrev > 0 ? " worse" : ""}`}
                    >
                      {session.diffVsPrev < 0
                        ? t("history.fewerThanLast", { n: Math.abs(session.diffVsPrev) })
                        : session.diffVsPrev > 0
                          ? t("history.moreThanLast", { n: session.diffVsPrev })
                          : t("history.sameAsLast")}
                    </span>
                  )}
                </div>

                <ul className="session-summary-list">
                  {session.items.map((item) => (
                    <li key={item.id} className="session-summary-row distraction">
                      {/* 切去别的软件那种是一段时间，不是一个瞬间：时间列直接写成起止 */}
                      <span className="session-summary-time">
                        {formatTimestamp(item.ts)}
                        {item.type === "app" && item.endTs && (
                          <span className="dst-time-end">–{formatTimestamp(item.endTs)}</span>
                        )}
                      </span>
                      <span className="session-summary-text muted">
                        {item.type === "app" ? (
                          <span className="dst-app-name">
                            {t("distraction.away.row", { app: item.appLabel || item.tag })}
                          </span>
                        ) : (
                          <>
                            {t("history.nthDistraction", { n: item.nth })}
                            {item.type === "proactive" && (
                              <span className="distraction-tag-inline">
                                {" "}· {t("history.proactivePause")}
                              </span>
                            )}
                            {item.tag && (
                              <span className="distraction-tag-inline"> · {item.tag}</span>
                            )}
                          </>
                        )}
                        {item.durationSecs != null && item.durationSecs > 0 && (
                          <span className="distraction-note-inline">
                            {" "}({formatDuration(item.durationSecs)})
                          </span>
                        )}
                        {item.note && (
                          <span className="distraction-note-inline"> {item.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
