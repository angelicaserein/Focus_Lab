import { useMemo } from "react";
import { useFocus } from "@/context/FocusContext";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { distractionByHour } from "@/utils/analytics/analyticsUtils";
import { buildSessions, enrichDistractionSessions } from "@/utils/analytics/sessionSummaryUtils";
import {
  sessionDurationMap,
  distractionOverview,
  distractionTagRanking,
  distractionDailyTrend,
} from "@/utils/analytics/distractionStats";

/**
 * 分心统计页的只读数据层。分心记录与专注页共用同一份 localStorage，
 * 这里只做 memoized 聚合，页面组件专心渲染。
 */
export default function useDistractionAnalytics() {
  const { focusRecords } = useFocus();
  const [distractions] = useLocalStorage(STORAGE_KEYS.DISTRACTIONS, []);

  const durationBySession = useMemo(() => sessionDurationMap(focusRecords), [focusRecords]);

  const overview = useMemo(
    () => distractionOverview(distractions, durationBySession),
    [distractions, durationBySession],
  );
  const hourly = useMemo(() => distractionByHour(distractions), [distractions]);
  const tagRanking = useMemo(() => distractionTagRanking(distractions), [distractions]);
  const trend = useMemo(() => distractionDailyTrend(distractions), [distractions]);

  // 会话明细：沿用历史页那套分组 + 洞察（次/h、与上次比、主要标签）。
  const sessions = useMemo(
    () =>
      enrichDistractionSessions(
        buildSessions(distractions, (d) => ({
          id: d.id,
          ts: d.ts,
          tag: d.tag ?? null,
          note: d.note ?? null,
          type: d.type ?? "reactive",
          durationSecs: d.durationSecs ?? null,
          // 桌面端自动记的那种：明细行要显示「几点到几点 · 哪个程序」
          endTs: d.endTs ?? null,
          appLabel: d.appLabel ?? null,
        })),
        durationBySession,
      ),
    [distractions, durationBySession],
  );

  return { distractions, overview, hourly, tagRanking, trend, sessions };
}
