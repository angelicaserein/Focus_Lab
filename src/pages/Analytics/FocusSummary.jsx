import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatDuration } from "@/utils/time";

// 页面顶部的「结论区」：一张主卡把最该记住的数字放大，其余指标退成一行小字。
// 从前这里是 5 张等大的统计卡（3+2 两行），谁都不比谁重要，看着就没有落点。
// 主色实底整页只用在这张卡上——它是唯一的视觉重点。
export default function FocusSummary({ stats }) {
  const { t } = useLanguage();
  const { totalSecs, todaySecs, sessionCount, longestSecs, avgSecs, chartData } = stats;

  const chartMax = Math.max(...chartData.map((d) => d.totalSecs), 1);

  // 副指标：三个一行，都是「拿来对照主数字」的，不值得各占一张卡
  const subs = [
    { key: "today", value: todaySecs > 0 ? formatDuration(todaySecs) : "—" },
    { key: "longest", value: longestSecs > 0 ? formatDuration(longestSecs) : "—" },
    { key: "average", value: avgSecs > 0 ? formatDuration(avgSecs) : "—" },
  ];

  return (
    <>
      <section className="ana-hero">
        <div className="ana-hero-label">{t("analytics.stat.total")}</div>
        <div className="ana-hero-value">{formatDuration(totalSecs)}</div>
        <div className="ana-hero-sessions">
          {t("analytics.stat.sessions", { count: sessionCount })}
        </div>

        <div className="ana-hero-subs">
          {subs.map(({ key, value }) => (
            <div key={key} className="ana-hero-sub">
              <span className="ana-hero-sub-value">{value}</span>
              <span className="ana-hero-sub-label">{t(`analytics.stat.${key}`)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ana-section">
        <div className="ana-section-hd">
          <span className="ana-section-title">{t("analytics.chartTitle")}</span>
        </div>

        <div className="ana-chart-card">
          {chartData.map((d) => (
            <div key={d.label} className={`ana-day-col${d.isToday ? " today" : ""}`}>
              <div className="ana-day-value">
                {d.totalSecs > 0 ? formatDuration(d.totalSecs) : ""}
              </div>
              <div className="ana-day-bar-wrap">
                <div
                  className="ana-day-bar"
                  style={{ height: `${(d.totalSecs / chartMax) * 100}%` }}
                />
              </div>
              <div className="ana-day-label">{d.label}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
