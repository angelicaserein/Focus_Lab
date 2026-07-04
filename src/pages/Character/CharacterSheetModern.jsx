import React from "react";
import { Coins, Flame, Target } from "lucide-react";
import { formatDuration } from "@/utils/time";
import { attrMetricText, achievementProgressText } from "./charView";

// 简约现代皮肤：沿用现有主题的卡片/圆角/配色变量，只加进度条、徽章与微动画。
// 与像素皮肤共享同一份 char 数据，仅渲染层不同。
export default function CharacterSheetModern({ char, t, lang }) {
  const rankName = lang === "zh" ? char.rank.zh : char.rank.en;
  const pct = Math.round(char.progress * 100);
  const unlockedAch = char.achievements.filter((a) => a.unlocked).length;

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
            <span>{t("character.xp")} {char.xpIntoLevel} / {char.xpForNextLevel}</span>
            <span>{t("character.toNext", { time: char.xpToNext })}</span>
          </div>
        </div>
      </div>

      {/* 经验来源拆解：让「加分」透明 */}
      <div className="cm-panel">
        <div className="cm-panel-title">{t("character.xpFrom")}</div>
        <div className="cm-xpsources">
          {char.xpBreakdown.sources.map((s) => (
            <div key={s.key} className="cm-xpsource">
              <span className="cm-xpsource-icon" aria-hidden="true">{s.icon}</span>
              <span className="cm-xpsource-name">{t(`character.xpSource.${s.key}`)}</span>
              <span className="cm-xpsource-val">+{s.xp}</span>
            </div>
          ))}
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

      {/* 固定人生属性 */}
      <div className="cm-panel">
        <div className="cm-panel-title">{t("character.attributes")}</div>
        <div className="cm-attrs">
          {char.attributes.map((a) => (
            <div key={a.id} className="cm-attr">
              <div className="cm-attr-icon" aria-hidden="true">{a.icon}</div>
              <div className="cm-attr-body">
                <div className="cm-attr-head">
                  <span className="cm-attr-name">{t(`character.attr.${a.id}`)}</span>
                  <span className="cm-attr-lv">Lv.{a.level}</span>
                </div>
                <div className="cm-attr-bar">
                  <div className="cm-attr-fill" style={{ width: `${Math.round(a.progress * 100)}%` }} />
                </div>
                <div className="cm-attr-metric">{attrMetricText(t, a)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 技能线（按情景） */}
      <div className="cm-panel">
        <div className="cm-panel-title">{t("character.skills")}</div>
        <div className="cm-hint">{t("character.skillsHint")}</div>
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
                  <span className="cm-skill-time">{formatDuration(s.secs)}</span>
                  <span className="cm-skill-lv">Lv.{s.level}</span>
                </div>
                <div className="cm-skill-bar">
                  <div className="cm-skill-fill" style={{ width: `${sp}%` }} />
                </div>
              </div>
            );
          })
        )}
        {char.lockedSkillCount > 0 && (
          <div className="cm-locked">🔒 {t("character.lockedSkills", { n: char.lockedSkillCount })}</div>
        )}
      </div>

      {/* 成就 */}
      <div className="cm-panel">
        <div className="cm-panel-title">
          {t("character.achievements")}
          <span className="cm-ach-count">
            {t("character.achUnlocked", { n: unlockedAch, total: char.achievements.length })}
          </span>
        </div>
        <div className="cm-ach-grid">
          {char.achievements.map((a) => (
            <div key={a.id} className={`cm-ach${a.unlocked ? " unlocked" : ""}`}>
              <div className="cm-ach-icon" aria-hidden="true">{a.icon}</div>
              <div className="cm-ach-title">{t(`character.ach.${a.id}.title`)}</div>
              <div className="cm-ach-desc">{t(`character.ach.${a.id}.desc`)}</div>
              {!a.unlocked && a.progress && (
                <div className="cm-ach-progress">{achievementProgressText(a.progress)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
