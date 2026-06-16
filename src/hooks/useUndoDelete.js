import { useState, useRef } from "react";

const UNDO_WINDOW_MS = 5000;

/**
 * 封装可撤销删除的通用逻辑，供 TodoContext / ScenarioContext 共用。
 *
 * @param {Object}   params
 * @param {Array}    params.items    - 当前数据数组（用于查找 index）
 * @param {Function} params.dispatch - useReducer 的 dispatch（接受 DELETE / RESTORE action）
 * @param {Function} params.onDelete   - (id, item, index) => meta | void  删除后的副作用，返回值存入 pendingDelete.meta
 * @param {Function} params.onRestore  - (item, meta) => void              撤销时用 meta 恢复副作用
 *
 * @returns {{ pendingDelete, deleteFn, undoDelete }}
 *   pendingDelete - { item, index, meta } | null，传给 Toast 组件
 *   deleteFn(id)  - 替代原来的 deleteTodo / deleteScenario
 *   undoDelete()  - 传给 Toast 的撤销按钮
 */
export function useUndoDelete({ items, dispatch, onDelete, onRestore }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const timerRef = useRef(null);

  const deleteFn = (id) => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;
    const item = items[index];

    dispatch({ type: "DELETE", payload: id });
    const meta = onDelete?.(id, item, index);

    if (timerRef.current) clearTimeout(timerRef.current);
    setPendingDelete({ item, index, meta });
    timerRef.current = setTimeout(() => {
      setPendingDelete(null);
      timerRef.current = null;
    }, UNDO_WINDOW_MS);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const { item, index, meta } = pendingDelete;
    dispatch({ type: "RESTORE", payload: { item, index } });
    onRestore?.(item, meta);
    setPendingDelete(null);
  };

  return { pendingDelete, deleteFn, undoDelete };
}
