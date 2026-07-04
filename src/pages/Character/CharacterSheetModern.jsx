import React from "react";
import { Coins, Flame, Target } from "lucide-react";
import { formatDuration } from "@/utils/time";

// 简约现代皮肤：沿用现有主题的卡片/圆角/配色变量，只加进度条、徽章与微动画。
// 与像素皮肤共享同一份 char 数据，仅渲染层不同。
export default function CharacterSheetModern({ char, t, lang }) {
  const rankName = lang === "zh" ? char.rank.zh : char.rank.en;
  const pct = Math.round(char.progress * 100);

  return (
    <div className="char-modern">
      {/* 英雄卡：头像 + 等级 + 经验条 */}
      <div className="cm-hero">
        <div className="cm-avatar" aria-hidden="true">{char.rank.icon}</div>
        <div className="cm-hero-main">
          <div className="cm-hero-top">
            <span className="cm-rank">{rankName}</span>
            <span className="cm-level">Lv.{char.level}</span>
          </div>
          <div className="cm-xpbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="cm-xpbar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="cm-xp-meta">
            <span>{t("character.xp")} {formatDuration(char.xpIntoLevel)} / {formatDuration(char.xpForNextLevel)}</span>
            <span>{t("character.toNext", { time: formatDuration(char.xpToNext) })}</span>
          </div>
        </div>
      </div>

      {/* 属性徽章 */}
      <div className="cm-stats">
        <div className="cm-stat">
          <Coins className="cm-stat-icon" size={20} aria-hidden="true" />
          <div className="cm-stat-val">{char.coins}</div>
          <div className="cm-stat-label">{t("character.coins")}</div>
        </div>
        <div className="cm-stat">
          <Flame className="cm-stat-icon" size={20} aria-hidden="true" />
          <div className="cm-stat-val">{char.streak}</div>
          <div className="cm-stat-label">{t("character.streak")}</div>
        </div>
        <div className="cm-stat">
          <Target className="cm-stat-icon" size={20} aria-hidden="true" />
          <div className="cm-stat-val">{char.sessionCount}</div>
          <div className="cm-stat-label">{t("character.sessions")}</div>
        </div>
      </div>

      {/* 技能线 */}
      <div className="cm-skills">
        <div className="cm-skills-title">{t("character.skills")}</div>
        {char.skills.length === 0 ? (
          <div className="cm-empty">{t("character.empty")}</div>
        ) : (
          char.skills.map((s) => {
            const name = s.unclassified ? t("character.freeExplore") : s.title;
            const sp = Math.round(s.progress * 100);
            return (
              <div key={s.id} className="cm-skill">
                <div className="cm-skill-head">
                  <span className="cm-skill-icon" aria-hidden="true">{s.icon}</span>
                  <span className="cm-skill-name">{name}</span>
                  <span className="cm-skill-lv">Lv.{s.level}</span>
                </div>
                <div className="cm-skill-bar">
                  <div className="cm-skill-fill" style={{ width: `${sp}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
