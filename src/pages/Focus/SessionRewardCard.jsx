import React, { useEffect, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import useCountUp from "@/hooks/common/useCountUp";
import { formatDuration } from "@/utils/time";
import { companionLine } from "@/data/companion/companionData";
import "./SessionRewardCard.css";

// 专注结束的结算卡：只报「本次实感」的三件事——专注了多久、分心了几次、奖励多少金币，
// 外加一句鼓励性语录。刻意不放角色形象、等级、经验条等评判类元素（ADHD 友好）。
// 数据来自 computeSessionReward，纯展示 + 金币入场动画。
export default function SessionRewardCard({ reward, onClose }) {
  const { t } = useLanguage();

  const coins = useCountUp(reward.coins);
  // 鼓励性语录：挂载时定一句，别随金币动画的每帧重渲染而抖动。
  const quote = useMemo(() => companionLine(t, "cheer"), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc 关闭
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="srewards-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="srewards-card" onClick={(e) => e.stopPropagation()}>
        <div className="srewards-title">{t("character.reward.title")}</div>
        <p className="srewards-quote">{quote}</p>

        <div className="srewards-stats">
          <div className="srewards-stat">
            <span className="srewards-stat-icon" aria-hidden="true">⏱️</span>
            <span className="srewards-stat-val">{formatDuration(reward.durationSecs)}</span>
            <span className="srewards-stat-label">{t("character.reward.focusTime")}</span>
          </div>
          <div className="srewards-stat">
            <span className="srewards-stat-icon" aria-hidden="true">💭</span>
            <span className="srewards-stat-val">{reward.distractionCount}</span>
            <span className="srewards-stat-label">{t("character.reward.distractions")}</span>
          </div>
          <div className="srewards-stat">
            <span className="srewards-stat-icon" aria-hidden="true">🪙</span>
            <span className="srewards-stat-val">+{coins}</span>
            <span className="srewards-stat-label">{t("character.reward.coins")}</span>
          </div>
        </div>

        <div className="srewards-actions">
          <button type="button" className="srewards-btn primary" onClick={onClose}>
            {t("character.reward.collect")}
          </button>
        </div>
      </div>
    </div>
  );
}
