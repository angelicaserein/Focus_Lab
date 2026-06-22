import { useMemo } from "react";
import { useFocus } from "../context/FocusContext";
import useLocalStorage from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { sessionKey, totalFocusSecs } from "../utils/focusRecords";
import {
  hourlyFocusData,
  timeBlockStats,
  sessionDurationBuckets,
  taskDifficultyRanking,
  distractionByHour,
} from "../utils/analyticsUtils";

/**
 * Analytics 页的只读数据层。
 * 从 FocusContext 取原始记录，统一在此做 memoized 计算，
 * 页面组件只负责渲染，不再直接调用 analyticsUtils。
 */
export default function useFocusAnalytics() {
  const { focusRecords } = useFocus();
  const [distractions] = useLocalStorage(STORAGE_KEYS.DISTRACTIONS, []);

  const hourly = useMemo(() => hourlyFocusData(focusRecords), [focusRecords]);
  const blocks = useMemo(() => timeBlockStats(hourly), [hourly]);
  const durationBuckets = useMemo(() => sessionDurationBuckets(focusRecords), [focusRecords]);
  const difficulty = useMemo(() => taskDifficultyRanking(focusRecords), [focusRecords]);
  const distData = useMemo(() => distractionByHour(distractions), [distractions]);

  const sessionCount = useMemo(
    () => new Set(focusRecords.map((r) => sessionKey(r))).size,
    [focusRecords],
  );

  const avgSessionSecs = useMemo(
    () => (sessionCount > 0 ? Math.round(totalFocusSecs(focusRecords) / sessionCount) : 0),
    [focusRecords, sessionCount],
  );

  return {
    focusRecords,
    hourly,
    blocks,
    durationBuckets,
    difficulty,
    distData,
    sessionCount,
    avgSessionSecs,
  };
}
