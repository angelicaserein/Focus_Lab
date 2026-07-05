import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import useCountUp from "@/hooks/common/useCountUp";
import { formatDuration } from "@/utils/time";
import { growthStageText, growthPhraseText } from "@/pages/Character/charView";
import "./SessionRewardCard.css";

// 本次成长的质化措辞：按本次获得的经验量给一句温柔的话，不报点数。
// 永远是正向的——哪怕只专注了一小会儿，也「算数」。
function rewardGrowKey(gainedXp) {
  if (gainedXp >= 1800) return "big";
  if (gainedXp >= 600) return "mid";
  return "small";
}

// 专注结束的结算叙事卡：把静默发币变成有仪式感的「本次收益」结算。
// 数据来自 computeSessionReward，纯展示 + 入场动画。
// 金币是可消费的奖励，保留数字；经验/等级/连续天数等「评判类」数字改用质化表达。
export default function SessionRewardCard({ reward, onClose }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const coins = useCountUp(reward.coins);
  const pct = Math.round(reward.progress * 100);
  const rankName = lang === "zh" ? reward.rank.zh : reward.rank.en;

  // Esc 关闭
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="srewards-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="srewards-card" onClick={(e) => e.stopPropagation()}>
        {reward.leveledUp && (
          <div className="srewards-levelup">
            <span className="srewards-levelup-spark" aria-hidden="true">✦</span>
            {t("character.reward.levelUp", { rank: rankName })}
            <span className="srewards-levelup-spark" aria-hidden="true">✦</span>
          </div>
        )}

        <div className="srewards-header">
          <div className="srewards-rank-icon" aria-hidden="true">{reward.rank.icon}</div>
          <div className="srewards-title">{t("character.reward.title")}</div>
          <div className="srewards-duration">
            {t("character.reward.duration", { time: formatDuration(reward.durationSecs) })}
          </div>
        </div>

        {/* 金币（可消费奖励，保留数字）+ 本次成长（质化措辞，不报点数） */}
        <div className="srewards-gains">
          <div className="srewards-gain">
            <span className="srewards-gain-icon" aria-hidden="true">🪙</span>
            <span className="srewards-gain-num">+{coins}</span>
            <span className="srewards-gain-label">{t("character.reward.coins")}</span>
          </div>
          <div className="srewards-gain">
            <span className="srewards-gain-icon" aria-hidden="true">✨</span>
            <span className="srewards-gain-word">{t(`character.reward.grow.${rewardGrowKey(reward.gainedXp)}`)}</span>
            <span className="srewards-gain-label">{t("character.reward.xpGained")}</span>
          </div>
        </div>

        {/* 本次成长来自（只列来源，不点数化） */}
        <div className="srewards-sources">
          {reward.sources.map((s) => (
            <div key={s.key} className="srewards-source">
              <span aria-hidden="true">{s.icon}</span>
              <span className="srewards-source-name">{t(`character.xpSource.${s.key}`)}</span>
            </div>
          ))}
        </div>

        {/* 成长条：填充 + 阶段名 + 温柔的「快到下一段」措辞，无分母 */}
        <div className="srewards-xpbar-wrap">
          <div className="srewards-xpbar">
            <div className="srewards-xpbar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="srewards-xpbar-meta">
            <span>{growthStageText(t, reward.level)}</span>
            <span>{growthPhraseText(t, reward.progress)}</span>
          </div>
        </div>

        {reward.streak > 1 && (
          <div className="srewards-streak">
            🔥 {t("character.reward.streakKept")}
          </div>
        )}

        <div className="srewards-actions">
          <button type="button" className="srewards-btn ghost" onClick={() => navigate("/character")}>
            {t("character.reward.viewCharacter")}
          </button>
          <button type="button" className="srewards-btn primary" onClick={onClose}>
            {t("character.reward.collect")}
          </button>
        </div>
      </div>
    </div>
  );
}
