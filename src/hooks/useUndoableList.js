import { useReducer, useEffect, useState, useRef } from "react";
import { createVersionedStorage } from "../utils/storage";

const UNDO_WINDOW_MS = 5000;

// Action types
const ADD = "ADD";
const DELETE = "DELETE";
const PATCH = "PATCH";
const RESTORE = "RESTORE";
const SET = "SET";

// 通用列表 reducer：用 PATCH({id, patch}) 合并字段，覆盖各自的编辑/切换语义。
function reducer(state, action) {
  switch (action.type) {
    case ADD: {
      return [action.payload, ...state];
    }
    case DELETE: {
      return state.filter((it) => it.id !== action.payload);
    }
    case PATCH: {
      const { id, patch } = action.payload;
      return state.map((it) => (it.id === id ? { ...it, ...patch } : it));
    }
    case RESTORE: {
      const { item, index } = action.payload;
      const next = state.slice();
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    }
    case SET: {
      return action.payload;
    }
    default:
      return state;
  }
}

// 抽取自 TodoContext / ScenarioContext 的公共骨架：
//   - 版本化 localStorage 初始化 + 持久化
//   - 通用 CRUD（add / patch / remove）
//   - 5 秒可撤销删除（pendingDelete + 定时落定）
// onRemove(item, meta) / onRestore(item, meta) 供调用方接副作用联动（专注集合 / 选中态等）。
export default function useUndoableList({
  storageKey,
  version,
  onRemove,
  onRestore,
} = {}) {
  const storageRef = useRef(null);
  if (!storageRef.current) {
    storageRef.current = createVersionedStorage(storageKey, version);
  }
  const storage = storageRef.current;

  const [items, dispatch] = useReducer(reducer, null, () => storage.load());

  // 可撤销删除：暂存最近一次被删的项（含 index 与调用方提供的 meta）
  const [pendingDelete, setPendingDelete] = useState(null);
  const undoTimerRef = useRef(null);

  useEffect(() => {
    storage.save(items);
  }, [items, storage]);

  const add = (item) => dispatch({ type: ADD, payload: item });

  const patch = (id, patchFields) =>
    dispatch({ type: PATCH, payload: { id, patch: patchFields } });

  const remove = (id, meta = {}) => {
    const index = items.findIndex((it) => it.id === id);
    if (index === -1) return;
    const item = items[index];

    dispatch({ type: DELETE, payload: id });
    onRemove?.(item, meta);

    // 暂存供撤销；若已有待撤销项则直接被新项替换（旧的落定）
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDelete({ item, index, meta });
    undoTimerRef.current = setTimeout(() => {
      setPendingDelete(null);
      undoTimerRef.current = null;
    }, UNDO_WINDOW_MS);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    const { item, index, meta } = pendingDelete;
    dispatch({ type: RESTORE, payload: { item, index } });
    onRestore?.(item, meta);
    setPendingDelete(null);
  };

  return { items, add, patch, remove, undoDelete, pendingDelete };
}
