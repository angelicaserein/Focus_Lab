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

  // 撤销删除时抹掉那条「删除」记录 —— 没发生过的事不该留在时间轴上
  const dropActivity = useCallback((id) => {
    if (!id) return;
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, [setActivities]);

  const clearActivities = useCallback(() => setActivities([]), [setActivities]);

  const value = useMemo(
    () => ({ activities, logActivity, dropActivity, clearActivities }),
    [activities, logActivity, dropActivity, clearActivities],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivityLog() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivityLog must be used within ActivityProvider");
  return ctx;
}
