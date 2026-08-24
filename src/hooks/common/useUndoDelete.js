import { useState, useRef } from "react";

// 撤销窗口。10 秒而不是 5 秒：注意力容易被打断的人往往在 toast 已经消失之后
// 才反应过来点错了，5 秒对目标人群偏短。
export const UNDO_WINDOW_MS = 10000;

/**
 * 封装可撤销删除的通用逻辑。TodoContext / ScenarioContext（reducer 数据）与
 * 备忘录 / DDL 检查点（localStorage 数据）共用同一套。
 *
 * 数据怎么删、怎么放回去有两种接法，二选一：
 *   · dispatch —— useReducer 的 dispatch，收 DELETE / RESTORE action（原有两处）
 *   · remove / restore —— 自己写的两个函数，给没有 reducer 的数据源用
 *
 * @param {Object}   params
 * @param {Array}    params.items    - 当前数据数组（用于查找 index）
 * @param {Function} [params.dispatch] - useReducer 的 dispatch
 * @param {Function} [params.remove]   - (id, item, index) => void  就地删除
 * @param {Function} [params.restore]  - (item, index, meta) => void 放回原处
 * @param {Function} params.onDelete   - (id, item, index) => meta | void  删除后的副作用，返回值存入 pendingDelete.meta
 * @param {Function} params.onRestore  - (item, meta) => void              撤销时用 meta 恢复副作用
 *
 * @returns {{ pendingDelete, deleteFn, undoDelete }}
 *   pendingDelete - { item, index, meta } | null，传给 Toast 组件
 *   deleteFn(id)  - 替代原来的 deleteTodo / deleteScenario
 *   undoDelete()  - 传给 Toast 的撤销按钮
 */
export default function useUndoDelete({ items, dispatch, remove, restore, onDelete, onRestore }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const timerRef = useRef(null);

  const deleteFn = (id) => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;
    const item = items[index];

    if (remove) remove(id, item, index);
    else dispatch({ type: "DELETE", payload: id });
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
    if (restore) restore(item, index, meta);
    else dispatch({ type: "RESTORE", payload: { item, index } });
    onRestore?.(item, meta);
    setPendingDelete(null);
  };

  return { pendingDelete, deleteFn, undoDelete };
}
