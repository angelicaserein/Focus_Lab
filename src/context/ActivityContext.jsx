import React, { useCallback, useContext, useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { makeActivity, pruneActivities } from "@/utils/records/activityLog";

// 使用记录流：谁在几点加/完成/删了任务。写入方主要是 TodoContext，
// 所以本 provider 必须在 TodoProvider 外层。读取方是时间轴页。

const ActivityContext = React.createContext(null);

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useLocalStorage(STORAGE_KEYS.ACTIVITY_LOG, []);

  // 返回新条目的 id，供调用方在动作被撤销时回收（见 dropActivity）
  const logActivity = useCallback((type, payload) => {
    const entry = makeActivity(type, payload);
    setActivities((prev) => pruneActivities([...prev, entry]));
    return entry.id;
  }, [setActivities]);

  // 同类动作一次记多条（批量删除、批量完成）。逐条 logActivity 会把整个日志
  // 复制 + 裁剪 N 遍；这里合并成一次追加、一次裁剪。
  const logActivities = useCallback((type, payloads) => {
    if (!payloads?.length) return;
    const entries = payloads.map((p) => makeActivity(type, p));
    setActivities((prev) => pruneActivities([...prev, ...entries]));
  }, [setActivities]);

  // 撤销删除时抹掉那条「删除」记录 —— 没发生过的事不该留在时间轴上
  const dropActivity = useCallback((id) => {
    if (!id) return;
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, [setActivities]);

  // 撤回一批新建时用（如「倒脑子」撤回）：把这些任务的某类记录整批抹掉
  const dropActivitiesForTasks = useCallback((taskIds, type) => {
    const ids = new Set(taskIds ?? []);
    if (!ids.size) return;
    setActivities((prev) => prev.filter((a) => !(a.type === type && ids.has(a.taskId))));
  }, [setActivities]);

  const clearActivities = useCallback(() => setActivities([]), [setActivities]);

  const value = useMemo(
    () => ({ activities, logActivity, logActivities, dropActivity, dropActivitiesForTasks, clearActivities }),
    [activities, logActivity, logActivities, dropActivity, dropActivitiesForTasks, clearActivities],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivityLog() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivityLog must be used within ActivityProvider");
  return ctx;
}
