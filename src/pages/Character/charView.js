// 角色卡的展示层小工具：把 characterUtils 的原始数据翻成界面文案。
// 两套皮肤（modern / pixel）与结算卡共用，避免各自重复 metricKind 分支与 i18n 拼 key。
//
// ADHD 友好原则：不用「评判类数字」（等级序号 / X-of-Y 分母 / 达成率% / 排名 / 连续 KPI），
// 这些会把行为量化成分数、不断提示「还没达到」。改用质化的阶段名、温柔措辞、
// 相对填充与势头词——进度感与奖励感保留，压力与比较去掉。
// 「专注时长」这类中性事实仍照常显示。
import { formatDuration } from "@/utils/time";

// 属性维度底部的「原始指标」文案，按 metricKind 决定单位（时长/天数/次数等事实，非评判）。
export function attrMetricText(t, attr) {
  switch (attr.metricKind) {
    case "time":
      return formatDuration(attr.metricValue);
    case "days":
      return t("character.unit.days", { n: attr.metricValue });
    case "sessions":
      return t("character.unit.cleanSessions", { n: attr.metricValue });
    case "count":
    default:
      return t("character.unit.count", { n: attr.metricValue });
  }
}

// 等级 → 质化「成长阶段名」。替代裸露的 Lv.N 序号：同样表达「走到哪一步」，
// 但不是可比高低的分数。5 档，越往后越稀有。
export function growthStageText(t, level) {
  const lv = Math.max(0, level | 0);
  const idx = lv <= 1 ? 0 : lv <= 3 ? 1 : lv <= 6 ? 2 : lv <= 10 ? 3 : 4;
  return t(`character.stage.${idx}`);
}

// 级内进度 → 温柔的「快到下一段」措辞。替代「还差 X 经验」「1200 / 3600」这类分母数字，
// 保留「在靠近」的方向感，但不报数、也不制造「未达」的落差。
export function growthPhraseText(t, progress) {
  const p = Math.max(0, Math.min(1, progress || 0));
  const key = p < 0.34 ? "early" : p < 0.67 ? "mid" : p < 0.9 ? "near" : "soon";
  return t(`character.grow.${key}`);
}

// 成就进度（cur / target）→ 质化「进行到哪」措辞。替代 1200 / 3600 的裸分母。
export function achievementProgressText(t, p) {
  if (!p || !p.target) return "";
  const ratio = Math.max(0, Math.min(1, p.cur / p.target));
  const key = ratio < 0.34 ? "start" : ratio < 0.75 ? "mid" : "close";
  return t(`character.achProg.${key}`);
}

// 成就进度对应的 0~1 填充比例，供无分母进度条使用。
export function achievementProgressRatio(p) {
  if (!p || !p.target) return 0;
  return Math.max(0, Math.min(1, p.cur / p.target));
}

// 势头（连续天数）→ 质化势头词。替代「连续第 N 天」这类连续 KPI：
// 断了不清零、不报数，只描述当下的节奏，避免「断签」带来的挫败。
export function momentumText(t, streak) {
  const s = Math.max(0, streak | 0);
  const key = s >= 7 ? "hot" : s >= 3 ? "rhythm" : s >= 1 ? "start" : "idle";
  return t(`character.momentum.${key}`);
}

// 经验来源的相对贡献 → 0~1 填充比例（无数字）。让「哪一项贡献大」用长短表达，而非点数。
export function contributionFraction(xp, max) {
  return max > 0 ? Math.max(0, Math.min(1, xp / max)) : 0;
}

// 相对贡献 → 1~n 的点数（像素皮肤用实心/空心点表达强弱）。
export function contributionDots(xp, max, n = 5) {
  if (max <= 0 || xp <= 0) return 0;
  return Math.max(1, Math.round((xp / max) * n));
}
