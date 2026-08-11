import { useMemo } from "react";
import { useFocus } from "@/context/FocusContext";
import { computeFocusStats } from "@/utils/records/focusRecords";
import {
  hourlyFocusData,
  timeBlockStats,
  sessionDurationBuckets,
  mergeTaskTable,
} from "@/utils/analytics/analyticsUtils";

/**
 * Analytics 页的只读数据层。
 * 从 FocusContext 取原始记录，统一在此做 memoized 计算，
 * 页面组件只负责渲染，不再直接调用 analyticsUtils。
 *
 * 只喂专注数据：分心那一份归 useDistractionAnalytics，本页不再摆分心摘要。
 */
export default function useFocusAnalytics() {
  const { focusRecords } = useFocus();

  const hourly = useMemo(() => hourlyFocusData(focusRecords), [focusRecords]);
  const blocks = useMemo(() => timeBlockStats(hourly), [hourly]);
  const durationBuckets = useMemo(() => sessionDurationBuckets(focusRecords), [focusRecords]);

  // 汇总数字 + 近 7 天：原先长在历史页，现与图表一并归口到数据分析页。
  const stats = useMemo(() => computeFocusStats(focusRecords), [focusRecords]);

  // 任务榜与完成率合成一张表（细节见 mergeTaskTable）
  const taskTable = useMemo(
    () => mergeTaskTable(focusRecords, stats.taskBreakdown),
    [focusRecords, stats.taskBreakdown],
  );

  return {
    focusRecords,
    hourly,
    blocks,
    durationBuckets,
    taskTable,
    stats,
    // 均值 computeFocusStats 已经算过（口径同为「按会话去重」），不再单独算一遍，
    // 改为从 stats 透出，避免两处口径漂移。会话数直接读 stats.sessionCount。
    avgSessionSecs: stats.avgSecs,
  };
}
