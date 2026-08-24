import { useMemo } from "react";
import { useFocus } from "@/context/FocusContext";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import {
  buildSessions,
  enrichDistractionSessions,
  toDistractionItem,
} from "@/utils/analytics/sessionSummaryUtils";
import { sessionDurationMap } from "@/utils/analytics/distractionStats";

/**
 * sessionId → 该会话的分心明细（含 次/h、与上次比、主要标签、每条 nth）。
 * 时间轴的会话卡点开时按会话取一条，洞察口径与分心统计页一致（都在全量记录上算）。
 * @returns {Map<string, object>}
 */
export default function useSessionDistractions() {
  const { focusRecords } = useFocus();
  const [distractions] = useLocalStorage(STORAGE_KEYS.DISTRACTIONS, []);

  return useMemo(() => {
    const durationBySession = sessionDurationMap(focusRecords);
    const sessions = enrichDistractionSessions(
      buildSessions(distractions, toDistractionItem),
      durationBySession,
    );
    return new Map(sessions.map((s) => [s.sessionId, s]));
  }, [distractions, focusRecords]);
}
