import React, { useContext, useMemo, useCallback, useRef, useState } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import useUndoDelete from "@/hooks/common/useUndoDelete";
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

  // 删检查点原来是「点一下就没了」：既没有确认也没有撤销，而同一个删除动作
  // 在任务库 / 备忘录都能反悔。这里接上同一套撤销 toast，行为对齐。
  //
  // 摊平成一维只为让通用 hook 能按 id 找到它；放回去时不必还原数组下标——
  // 页面本来就按 daysBeforeDeadline 排序显示，追加到末尾看起来完全一样。
  const flatCheckpoints = useMemo(
    () =>
      Object.entries(checkpointsMap).flatMap(([todoId, list]) =>
        (list || []).map((cp) => ({ ...cp, todoId })),
      ),
    [checkpointsMap],
  );

  const undo = useUndoDelete({
    items: flatCheckpoints,
    remove: (cpId, item) => {
      setCheckpointsMap((prev) => ({
        ...prev,
        [item.todoId]: (prev[item.todoId] || []).filter((cp) => cp.id !== cpId),
      }));
    },
    restore: (item) => {
      const { todoId, ...cp } = item;
      setCheckpointsMap((prev) => ({
        ...prev,
        [todoId]: [...(prev[todoId] || []), cp],
      }));
    },
  });

  // hook 返回的两个函数每次渲染都是新引用，直接进依赖会让整个 context value
  // 每渲染重建一次。走 ref 取最新值，对外暴露的引用保持稳定。
  const undoApi = useRef(null);
  undoApi.current = undo;

  // 签名保持 (todoId, cpId) 不变：调用点不必知道撤销是怎么实现的。
  const deleteCheckpoint = useCallback((_todoId, cpId) => {
    undoApi.current.deleteFn(cpId);
  }, []);

  const undoLast = useCallback(() => undoApi.current.undoDelete(), []);

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
    pendingUndo: undo.pendingDelete,
    undoLast,
  }), [
    undo.pendingDelete,
    undoLast,
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
