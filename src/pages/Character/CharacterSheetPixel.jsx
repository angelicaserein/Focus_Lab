import React from "react";
import { formatDuration } from "@/utils/time";
import { attrMetricText, achievementProgressText } from "./charView";

// 像素复古皮肤：8-bit 对话框边框 + 分段式经验条 + 等宽像素字。
// 用 12 段的分段条模拟老式 RPG 的经验格子，视觉上比连续条更「游戏感」。
const SEGMENTS = 12;

function SegBar({ progress }) {
  const filled = Math.round(progress * SEGMENTS);
  return (
    <div className="cp-segbar" aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span key={i} className={`cp-seg${i < filled ? " on" : ""}`} />
      ))}
    </div>
  );
}

export default function CharacterSheetPixel({ char, t, lang }) {
  const rankName = lang === "zh" ? char.rank.zh : char.rank.en;
  const unlockedAch = char.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="char-pixel">
      {/* 角色框 */}
      <div className="cp-box cp-hero">
        <div className="cp-portrait" aria-hidden="true">{char.rank.icon}</div>
        <div className="cp-hero-main">
          <div className="cp-name">{rankName}</div>
          <div className="cp-lv">LV {char.level}</div>
          <SegBar progress={char.progress} />
          <div className="cp-xp">EXP {char.xpIntoLevel} / {char.xpForNextLevel}</div>
        </div>
      </div>

      {/* 经验来源 */}
      <div className="cp-box">
        <div className="cp-box-title">▸ {t("character.xpFrom")}</div>
        {char.xpBreakdown.sources.map((s) => (
          <div key={s.key} className="cp-stat-row">
            <span className="cp-stat-key">{s.icon} {t(`character.xpSource.${s.key}`)}</span>
            <span className="cp-stat-dots" aria-hidden="true" />
            <span className="cp-stat-num">+{s.xp}</span>
          </div>
        ))}
      </div>

      {/* 状态栏（HP/MP 风格） */}
      <div className="cp-box cp-stats">
        <div className="cp-stat-row">
          <span className="cp-stat-key">🪙 {t("character.coins")}</span>
          <span className="cp-stat-dots" aria-hidden="true" />
          <span className="cp-stat-num">{char.coins}</span>
        </div>
        <div className="cp-stat-row">
          <span className="cp-stat-key">🔥 {t("character.streak")}</span>
          <span className="cp-stat-dots" aria-hidden="true" />
          <span className="cp-stat-num">{char.streak}</span>
        </div>
        <div className="cp-stat-row">
          <span className="cp-stat-key">🎯 {t("character.sessions")}</span>
          <span className="cp-stat-dots" aria-hidden="true" />
          <span className="cp-stat-num">{char.sessionCount}</span>
        </div>
      </div>

      {/* 属性表 */}
      <div className="cp-box">
        <div className="cp-box-title">▸ {t("character.attributes")}</div>
        {char.attributes.map((a) => (
          <div key={a.id} className="cp-skill">
            <div className="cp-skill-head">
              <span>{a.icon} {t(`character.attr.${a.id}`)}</span>
              <span className="cp-skill-lv">LV {a.level} · {attrMetricText(t, a)}</span>
            </div>
            <SegBar progress={a.progress} />
          </div>
        ))}
      </div>

      {/* 技能表 */}
      <div className="cp-box cp-skills">
        <div className="cp-box-title">▸ {t("character.skills")}</div>
        <div className="cp-hint">{t("character.skillsHint")}</div>
        {char.skills.length === 0 ? (
          <div className="cp-empty">{t("character.empty")}</div>
        ) : (
          char.skills.map((s) => {
            const name = s.unclassified ? t("character.freeExplore") : s.title;
            return (
              <div key={s.id} className="cp-skill">
                <div className="cp-skill-head">
                  <span>{s.icon} {name}</span>
                  <span className="cp-skill-lv">LV {s.level} · {formatDuration(s.secs)}</span>
                </div>
                <SegBar progress={s.progress} />
              </div>
            );
          })
        )}
        {char.lockedSkillCount > 0 && (
          <div className="cp-locked">🔒 {t("character.lockedSkills", { n: char.lockedSkillCount })}</div>
        )}
      </div>

      {/* 成就 */}
      <div className="cp-box">
        <div className="cp-box-title">
          ▸ {t("character.achievements")} [{unlockedAch}/{char.achievements.length}]
        </div>
        <div className="cp-ach-grid">
          {char.achievements.map((a) => (
            <div key={a.id} className={`cp-ach${a.unlocked ? " unlocked" : ""}`} title={t(`character.ach.${a.id}.desc`)}>
              <span className="cp-ach-icon" aria-hidden="true">{a.unlocked ? a.icon : "🔒"}</span>
              <span className="cp-ach-title">{t(`character.ach.${a.id}.title`)}</span>
              {!a.unlocked && a.progress && (
                <span className="cp-ach-progress">{achievementProgressText(a.progress)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
