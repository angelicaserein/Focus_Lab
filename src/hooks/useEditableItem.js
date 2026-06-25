import { useState, useMemo, useRef, useEffect } from "react";

// 列表项共有的交互生命周期：删除动画、就地编辑、「新建高亮」。
// 草稿值（单字段 / 多字段）由调用方维护，通过 onEditStart/onCommit/onCancel 回调读写。
//   - onEditStart：进入编辑前同步草稿
//   - onCommit：读取草稿并决定是否落库（trim/比对在调用方）
//   - onCancel：还原草稿
export default function useEditableItem({
  createdAt,
  onDelete,
  onEditStart,
  onCommit,
  onCancel,
  deleteDelayMs = 320,
  newWindowMs = 2000,
} = {}) {
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  const isNew = useMemo(() => {
    if (!createdAt) return false;
    return Date.now() - createdAt < newWindowMs;
  }, [createdAt, newWindowMs]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => onDelete?.(), deleteDelayMs);
  };

  const startEdit = (e) => {
    e?.stopPropagation();
    onEditStart?.();
    setEditing(true);
  };

  const commitEdit = () => {
    onCommit?.();
    setEditing(false);
  };

  const cancelEdit = () => {
    onCancel?.();
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return {
    removing,
    editing,
    isNew,
    inputRef,
    handleDelete,
    startEdit,
    commitEdit,
    cancelEdit,
    handleKeyDown,
  };
}
