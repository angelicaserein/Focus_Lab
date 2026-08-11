// 「一天的流水」—— 把一天里发生的两类事合成同一条按时刻排的列表：
//   · 专注会话（开了计时器）：一次会话一张卡，卡内逐任务列结果
//   · 使用记录（没开计时器也发生的）：加 / 完成 / 撤销 / 删，只有时刻没有时长
//
// 历史记录页（全部日期）与时间轴页（选中那天）曾各写一套渲染，同一件事显示两遍还长得不一样。
// 现在两边共用这份数据 + components/records/DayLog：/calendar 一页两种看法：「全部记录」是总记录，「日历」是哪天的记录。
import { groupBySession } from "./focusRecords";
import { clusterActivities } from "./activityLog";

// 当日小结里动作的固定顺序（完成在前，撤销垫底）
export const ACTIVITY_ORDER = ["complete", "add", "delete", "uncomplete"];

// 分心密度（次/小时）→ 质量标签。没分心或净专注为 0 时无从评价，返回 null。
export function focusQuality(distractionCount, netSecs) {
  if (!distractionCount || netSecs <= 0) return null;
  const rate = distractionCount / (netSecs / 3600);
  if (rate <= 1) return { labelKey: "history.quality.deep", cls: "deep" };
  if (rate <= 3) return { labelKey: "history.quality.good", cls: "good" };
  return { labelKey: "history.quality.scattered", cls: "scattered" };
}

// 一次专注 → 一张卡所需的全部展示数据
function toSessionEntry(session) {
  let coins = 0;
  let distractionCount = 0;
  let distractionSecs = 0;
  let scenarioTitle;
  let endedAt = 0;
  for (const r of session.records) {
    coins += r.coinsEarned ?? 0;
    // 结束时刻取整段最晚的一条；旧记录没有 endedAt 时按开始 + 时长反推
    endedAt = Math.max(endedAt, r.endedAt ?? r.startedAt + r.durationSecs * 1000);
    // 分心是整段会话的快照、每条记录上都是同一份 → 取最大值而非累加（口径同 totalSecs）
    distractionCount = Math.max(distractionCount, r.distractionCount ?? 0);
    distractionSecs = Math.max(distractionSecs, r.distractionSecs ?? 0);
    if (!scenarioTitle && r.scenarioTitle) scenarioTitle = r.scenarioTitle;
  }
  const netSecs = Math.max(0, session.totalSecs - distractionSecs);
  return {
    kind: "session",
    key: session.key,
    ts: session.startedAt,
    endedAt: Math.max(endedAt, session.startedAt),
    totalSecs: session.totalSecs,
    records: session.records,
    scenarioTitle,
    coins,
    distractionCount,
    distractionSecs,
    netSecs,
    quality: focusQuality(distractionCount, netSecs),
  };
}

/**
 * 某天的流水：会话卡与使用记录混排，最近的在最上面。
 * @returns [{ kind: "session" | "activity", key, ts, ... }]
 */
export function buildDayEntries(records, activities = []) {
  const sessions = groupBySession(records).map(toSessionEntry);
  const marks = clusterActivities(activities).map((c) => ({
    kind: "activity",
    key: c.id,
    ts: c.ts,
    mark: c,
  }));
  return [...sessions, ...marks].sort((a, b) => b.ts - a.ts);
}

// 分组标题用的本地化日期串（"2026年8月11日" / "August 11, 2026"）
function dayLabel(ts, lang) {
  return new Date(ts).toLocaleDateString(lang === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 按自然日分组，专注记录与使用记录落进同一天；新的一天在前。
 * 只有使用记录、没专注的日子照样成组 —— 总记录要看得到那天确实做了事。
 * @returns [{ key, label, sortTs, records, activities }]
 */
export function groupDays(records, activities = [], lang = "zh") {
  const map = new Map();
  const bucket = (ts) => {
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: dayLabel(ts, lang),
        sortTs: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
        records: [],
        activities: [],
      });
    }
    return map.get(key);
  };
  for (const r of records) bucket(r.startedAt).records.push(r);
  for (const a of activities) bucket(a.ts).activities.push(a);
  return [...map.values()].sort((a, b) => b.sortTs - a.sortTs);
}
