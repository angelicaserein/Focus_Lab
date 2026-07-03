import React, { useContext, useMemo, useCallback, useState } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { collectDueReminders } from "@/utils/ddlUtils";

const DDLContext = React.createContext(null);

// checkpointsMap: { [todoId]: [{ id, daysBeforeDeadline, message, done }] }
export function DDLProvider({ children }) {
  const [checkpointsMap, setCheckpointsMap] = useLocalStorage(
    STORAGE_KEYS.DDL_CHECKPOINTS,
    {}
  );

  // 调试用：强制打开弹窗（不影响"今日已关闭"记录）
  const [modalForcedOpen, setModalForcedOpen] = useState(false);

  const getCheckpoints = useCallback(
    (todoId) => checkpointsMap[todoId] || [],
    [checkpointsMap]
  );

  const addCheckpoint = useCallback((todoId, { daysBeforeDeadline, message }) => {
    const cp = {
      id: crypto.randomUUID(),
      daysBeforeDeadline: Number(daysBeforeDeadline),
      message: message.trim(),
      done: false,
    };
    setCheckpointsMap((prev) => ({
      ...prev,
      [todoId]: [...(prev[todoId] || []), cp],
    }));
  }, [setCheckpointsMap]);

  const editCheckpoint = useCallback((todoId, cpId, updates) => {
    setCheckpointsMap((prev) => ({
      ...prev,
      [todoId]: (prev[todoId] || []).map((cp) =>
        cp.id === cpId ? { ...cp, ...updates } : cp
      ),
    }));
  }, [setCheckpointsMap]);

  const deleteCheckpoint = useCallback((todoId, cpId) => {
    setCheckpointsMap((prev) => ({
      ...prev,
      [todoId]: (prev[todoId] || []).filter((cp) => cp.id !== cpId),
    }));
  }, [setCheckpointsMap]);

  const toggleCheckpointDone = useCallback((todoId, cpId) => {
    setCheckpointsMap((prev) => ({
      ...prev,
      [todoId]: (prev[todoId] || []).map((cp) =>
        cp.id === cpId ? { ...cp, done: !cp.done } : cp
      ),
    }));
  }, [setCheckpointsMap]);

  // 计算所有已到期且未完成的提醒节点（供 Sidebar badge 使用）
  // 调用方需传入 todos 数组，避免 DDLContext 依赖 TodoContext 形成循环
  const computeBadgeCount = useCallback(
    (todos) => collectDueReminders(todos, checkpointsMap).length,
    [checkpointsMap]
  );

  const value = useMemo(() => ({
    checkpointsMap,
    getCheckpoints,
    addCheckpoint,
    editCheckpoint,
    deleteCheckpoint,
    toggleCheckpointDone,
    computeBadgeCount,
    modalForcedOpen,
    setModalForcedOpen,
  }), [
    checkpointsMap,
    getCheckpoints,
    addCheckpoint,
    editCheckpoint,
    deleteCheckpoint,
    toggleCheckpointDone,
    computeBadgeCount,
    modalForcedOpen,
  ]);

  return <DDLContext.Provider value={value}>{children}</DDLContext.Provider>;
}

export function useDDL() {
  const ctx = useContext(DDLContext);
  if (!ctx) throw new Error("useDDL must be used within DDLProvider");
  return ctx;
}
