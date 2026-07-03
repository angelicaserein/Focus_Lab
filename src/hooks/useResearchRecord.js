import { useState, useEffect, useCallback, useMemo } from "react";
import { useFocus } from "@/context/FocusContext";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { todayDateStr, buildEmptyRecord, computeAutoData } from "@/utils/records/researchRecords";

// 管理单日研究记录的加载、编辑草稿和保存逻辑。
export default function useResearchRecord(dateStr) {
  const [records, setRecords] = useLocalStorage(STORAGE_KEYS.RESEARCH_RECORDS, []);
  const { focusRecords } = useFocus();
  const [distractions] = useLocalStorage(STORAGE_KEYS.DISTRACTIONS, []);
  const [draft, setDraft] = useState(() => buildEmptyRecord(todayDateStr()));
  const [savedAnim, setSavedAnim] = useState(false);

  const autoData = useMemo(
    () => computeAutoData(focusRecords, distractions, dateStr),
    [focusRecords, distractions, dateStr],
  );

  const existingRecord = useMemo(
    () => records.find((r) => r.date === dateStr) ?? null,
    [records, dateStr],
  );

  useEffect(() => {
    setDraft(existingRecord ? { ...existingRecord } : buildEmptyRecord(dateStr));
  }, [dateStr, existingRecord]);

  const setScale = useCallback((key, val) => {
    setDraft((prev) => ({ ...prev, scales: { ...prev.scales, [key]: val } }));
  }, []);

  const setRetro = useCallback((key, val) => {
    setDraft((prev) => ({ ...prev, retrospective: { ...prev.retrospective, [key]: val } }));
  }, []);

  const setExperience = useCallback((val) => {
    setDraft((prev) => ({ ...prev, experience: val }));
  }, []);

  const handleSave = useCallback(() => {
    const record = {
      id: existingRecord?.id ?? crypto.randomUUID(),
      date: dateStr,
      savedAt: Date.now(),
      autoData,
      scales: draft.scales,
      retrospective: draft.retrospective,
      experience: draft.experience,
    };
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === dateStr);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [...prev, record];
    });
    setSavedAnim(true);
    setTimeout(() => setSavedAnim(false), 2000);
  }, [dateStr, draft, autoData, existingRecord, setRecords]);

  return {
    records,
    draft,
    autoData,
    existingRecord,
    savedAnim,
    setScale,
    setRetro,
    setExperience,
    handleSave,
  };
}
