import { useCallback, useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { DEFAULT_SPLIT_PREFS, normalizeSplitPrefs } from "@/utils/ai/taskSplitPrefs";

// 倒脑子的拆分偏好：设置页写，倒脑子读。存档一律过 normalize，
// 老存档 / 手改坏的字段都会退回默认值，而不是把脏值拼进 prompt。
export default function useTaskSplitPrefs() {
  const [raw, setRaw] = useLocalStorage(STORAGE_KEYS.TASK_SPLIT_PREFS, DEFAULT_SPLIT_PREFS);
  const prefs = useMemo(() => normalizeSplitPrefs(raw), [raw]);

  const setPref = useCallback(
    (patch) => setRaw((prev) => normalizeSplitPrefs({ ...normalizeSplitPrefs(prev), ...patch })),
    [setRaw],
  );

  const reset = useCallback(() => setRaw(DEFAULT_SPLIT_PREFS), [setRaw]);

  return { prefs, setPref, reset };
}
