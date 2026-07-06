import React, { useMemo, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useFocus } from "@/context/FocusContext";
import useCharacter from "@/hooks/character/useCharacter";
import useCountUp from "@/hooks/common/useCountUp";
import { narrateForeman } from "@/utils/ai/aiNarrate";
import { computeIndustry, lineRawText } from "./industryData";
import "./Industry.css";

// 工业点数页：把真实专注行为呈现成一座自动化工厂——五条产线汇成工业点数总产能。
// 灵感取自《明日方舟：终末地》的工业系统骨架，数值全部衍生、无门禁、无新增存储。
export default function IndustryPage() {
  const { t, lang } = useLanguage();
  const char = useCharacter();
  const { focusRecords } = useFocus();

  const ind = useMemo(
    () => computeIndustry({ metrics: char.metrics, records: focusRecords }),
    [char.metrics, focusRecords],
  );

  const totalRolling = useCountUp(ind.total, { duration: 1000 });

  // 厂长播报：一句 AI（或本地兜底）生成的车间广播。仅在数据/语言变化或手动刷新时重生成。
  const [foreman, setForeman] = useState({ text: "", loading: true });
  const [fvariant, setFvariant] = useState(0);
  useEffect(() => {
    let alive = true;
    setForeman((s) => ({ ...s, loading: true }));
    const topLine = ind.lines.reduce((a, b) => (b.ip > a.ip ? b : a), ind.lines[0]);
    const ctx = {
      tierName: t(`industry.tier.${ind.tier.key}`),
      totalIp: ind.total,
      todayIp: ind.throughput.today,
      topLineName: topLine && topLine.ip > 0 ? t(`industry.line.${topLine.key}`) : null,
      running: ind.total > 0,
    };
    narrateForeman(ctx, { lang, variant: fvariant }).then((res) => {
      if (alive) setForeman({ text: res.text, loading: false });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fvariant, lang, ind.total]);
  const tierName = t(`industry.tier.${ind.tier.key}`);
  const nextName = ind.tier.next ? t(`industry.tier.${ind.tier.next.key}`) : null;

  return (
    <div className="page-industry">
      <div className="ind-headline">
        <h1>{t("industry.title")}</h1>
        <p className="ind-subtitle">{t("industry.subtitle")}</p>
      </div>

      {/* 工业总览 HUD：总产能 + 发展等级 + 产能负荷 + 节流指标 */}
      <div className="ind-hud">
        <div className="ind-hud-grid" aria-hidden="true" />
        <div className="ind-hud-main">
          <div className="ind-total-topline">
            <span className="ind-total-label">{t("industry.total")}</span>
            <span className={`ind-status${ind.total > 0 ? " on" : ""}`}>
              <span className="ind-status-dot" aria-hidden="true" />
              {ind.total > 0 ? t("industry.online") : t("industry.idle")}
            </span>
          </div>
          <div className="ind-total">
            <span className="ind-total-num">{totalRolling.toLocaleString()}</span>
            <span className="ind-total-unit">IP</span>
          </div>

          <div className="ind-tier">
            <span className="ind-tier-icon" aria-hidden="true">{ind.tier.icon}</span>
            <span className="ind-tier-name">{tierName}</span>
          </div>

          <div className="ind-capacity" role="progressbar" aria-valuenow={Math.round(ind.tier.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="ind-capacity-fill" style={{ width: `${ind.tier.progress * 100}%` }} />
          </div>
          <div className="ind-capacity-meta">
            <span>{tierName}</span>
            {nextName ? <span>{nextName}</span> : <span>{t("industry.tierMax")}</span>}
          </div>
        </div>

        <div className="ind-throughput">
          <div className="ind-tp">
            <div className="ind-tp-val">+{ind.throughput.today.toLocaleString()}</div>
            <div className="ind-tp-label">{t("industry.today")}</div>
          </div>
          <div className="ind-tp">
            <div className="ind-tp-val">{ind.throughput.perDay.toLocaleString()}</div>
            <div className="ind-tp-label">{t("industry.perDay")}</div>
          </div>
        </div>
      </div>

      {/* 厂长播报：工业风控制台日志（AI 增强层，无 key 有本地兜底） */}
      <div className="ind-log">
        <span className="ind-log-caret" aria-hidden="true">▸</span>
        <span className={`ind-log-text${foreman.loading ? " loading" : ""}`}>
          {foreman.loading ? t("industry.foremanLoading") : foreman.text}
        </span>
        <button
          type="button"
          className="ind-log-refresh"
          onClick={() => setFvariant((v) => v + 1)}
          disabled={foreman.loading}
          aria-label={t("industry.foremanRefresh")}
          title={t("industry.foremanRefresh")}
        >
          <RefreshCw size={13} className={foreman.loading ? "ind-spin" : ""} aria-hidden="true" />
        </button>
      </div>

      {/* 生产链：五条产线 → 汇流到总产能 */}
      <div className="ind-chain">
        <div className="ind-chain-title">
          <span>{t("industry.chain")}</span>
          <span className="ind-chain-hint">{t("industry.chainHint")}</span>
        </div>

        <div className="ind-lines">
          {ind.lines.map((line) => (
            <div key={line.key} className={`ind-line ind-line-${line.key}`}>
              <div className="ind-line-icon" aria-hidden="true">{line.icon}</div>
              <div className="ind-line-body">
                <div className="ind-line-head">
                  <span className="ind-line-name">{t(`industry.line.${line.key}`)}</span>
                  <span className="ind-line-raw">{lineRawText(t, line)}</span>
                </div>
                <div className="ind-line-track">
                  <div className="ind-line-bar" style={{ width: `${Math.max(line.ip > 0 ? 6 : 0, line.share * 100)}%` }} />
                </div>
              </div>
              <div className="ind-line-out">
                <span className="ind-line-ip">+{line.ip.toLocaleString()}</span>
                <span className="ind-line-ip-unit">IP</span>
              </div>
            </div>
          ))}
        </div>

        <div className="ind-sum">
          <span className="ind-sum-label">{t("industry.output")}</span>
          <span className="ind-sum-rail" aria-hidden="true" />
          <span className="ind-sum-val">{ind.total.toLocaleString()} <em>IP</em></span>
        </div>
      </div>

      <p className="ind-foot">{t("industry.foot")}</p>
    </div>
  );
}
