// 角色卡的展示层小工具：把 characterUtils 的原始数据翻成界面文案。
// 两套皮肤（modern / pixel）共用，避免各自重复 metricKind 分支与 i18n 拼 key。
import { formatDuration } from "@/utils/time";

// 属性维度底部的「原始指标」文案，按 metricKind 决定单位。
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

// 成就进度文案，如「1200 / 3600」或「时长 20m / 60m」。
export function achievementProgressText(p) {
  if (!p) return "";
  return `${p.cur} / ${p.target}`;
}
