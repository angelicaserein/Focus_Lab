// 工业点数（借鉴《明日方舟：终末地》AIC 自动化工业的「生产链 → 工业点数总量 → 发展等级」骨架，
// 但数值全部由 Focus Lab 的真实行为推导，不照抄原作公式，也不新增任何持久化字段）。
//
// 设计思路：把「你做过的事」看成一座随专注不断扩张的自动化工厂——
//   专注时长 = 采矿开采的原料；零分心时长 = 精炼提纯的加成；完成任务 = 装配下线的成品；
//   活跃天数 = 稳定供电；场景广度 = 物流网络。五条产线各自产出工业点数，汇成总产能。
// 工业点数只累加、不清零、无「未达标」分母，契合角色系统的 ADHD 友好原则——
//   它表达的是「一路造出来多少」这一中性事实，不是与目标比较的评判分。
/** @import { FocusRecord } from '@/types' */

import { formatDuration } from "@/utils/time";
import { totalFocusSecs } from "@/utils/records/focusRecords";

// 各产线的换算单价（工业点 IP）。用「≈ 专注 1 分钟 = 1 IP」标定，方便同尺度理解。
export const IP_PER_FOCUS_MIN = 1; // 采矿：每专注 1 分钟
export const IP_PER_CLEAN_MIN = 1; // 精炼：零分心时长的额外提纯（相当于优质原料翻倍）
export const IP_PER_TASK = 5; // 装配：每下线 1 个成品（完成任务）
export const IP_PER_ACTIVE_DAY = 8; // 供电：每稳定运转 1 天（有专注）
export const IP_PER_SCENARIO = 12; // 物流：每铺开 1 条产线（专注过的场景）

// 发展等级（工业规模）。取 points >= min 的最后一档。纯质化阶段名，不报「还差多少」。
export const INDUSTRY_TIERS = [
  { min: 0, key: "outpost", icon: "🚩" },
  { min: 300, key: "worksite", icon: "🏗️" },
  { min: 1200, key: "line", icon: "⚙️" },
  { min: 3000, key: "factory", icon: "🏭" },
  { min: 8000, key: "complex", icon: "🏙️" },
  { min: 18000, key: "hub", icon: "🛰️" },
];

export function tierForPoints(points) {
  let idx = 0;
  for (let i = 0; i < INDUSTRY_TIERS.length; i++) {
    if (points >= INDUSTRY_TIERS[i].min) idx = i;
  }
  const tier = INDUSTRY_TIERS[idx];
  const next = INDUSTRY_TIERS[idx + 1] ?? null;
  const progress = next ? Math.max(0, Math.min(1, (points - tier.min) / (next.min - tier.min))) : 1;
  return { ...tier, index: idx, next, progress };
}

const DAY_MS = 86400000;
function dayStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// 原始输入的展示文案（中性事实：时长 / 天数 / 个数）。
export function lineRawText(t, line) {
  if (line.rawKind === "time") return formatDuration(line.rawValue);
  if (line.rawKind === "days") return t("character.unit.days", { n: line.rawValue });
  return t("character.unit.count", { n: line.rawValue });
}

// 由角色 metrics（已聚合的行为指标）+ 原始专注记录，算出整座工厂的产出。
//   metrics —— computeCharacter 里的 metrics（totalSecs / cleanSessionSecs / completedTasks / focusDays / distinctScenarios）
//   records —— 原始 FocusRecord[]，用于「今日产出」这一节流指标
/** @param {{ metrics: object, records?: FocusRecord[], now?: number }} input */
export function computeIndustry({ metrics, records = [], now = Date.now() }) {
  const lines = [
    { key: "extract", icon: "⛏️", rawKind: "time", rawValue: metrics.totalSecs, ip: Math.floor(metrics.totalSecs / 60) * IP_PER_FOCUS_MIN },
    { key: "refine", icon: "🏭", rawKind: "time", rawValue: metrics.cleanSessionSecs, ip: Math.floor(metrics.cleanSessionSecs / 60) * IP_PER_CLEAN_MIN },
    { key: "assembly", icon: "🔧", rawKind: "count", rawValue: metrics.completedTasks, ip: metrics.completedTasks * IP_PER_TASK },
    { key: "power", icon: "⚡", rawKind: "days", rawValue: metrics.focusDays, ip: metrics.focusDays * IP_PER_ACTIVE_DAY },
    { key: "logistics", icon: "🚚", rawKind: "count", rawValue: metrics.distinctScenarios, ip: metrics.distinctScenarios * IP_PER_SCENARIO },
  ];

  const total = lines.reduce((s, l) => s + l.ip, 0);
  const maxIp = Math.max(1, ...lines.map((l) => l.ip));
  const linesOut = lines.map((l) => ({ ...l, share: l.ip / maxIp }));

  const tier = tierForPoints(total);

  // 今日产出：以今天的专注时长折算（最可靠、最能体现「工厂今天开工多少」）。
  const today = dayStart(now);
  const todayFocusSecs = totalFocusSecs(records.filter((r) => dayStart(r.startedAt) === today));
  const todayIp = Math.floor(todayFocusSecs / 60) * IP_PER_FOCUS_MIN;

  // 日均产能：总产出 / 有专注的天数。
  const perDay = metrics.focusDays > 0 ? Math.round(total / metrics.focusDays) : 0;

  return {
    total,
    tier,
    lines: linesOut,
    throughput: { today: todayIp, perDay },
  };
}
