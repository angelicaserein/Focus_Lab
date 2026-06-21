import { useState, useEffect, useRef, useCallback } from "react";

// 封装"行内编辑"模式的通用逻辑：editing 状态、草稿值、输入框聚焦。
// externalValue 变化时会同步更新草稿（例如外部撤销操作）。
// 返回 { editing, draft, setDraft, startEdit, commitEdit, cancelEdit, inputRef }
export default function useEditMode(externalValue) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(externalValue);
  const inputRef = useRef(null);

  // 外部值变更时同步草稿（仅在非编辑状态下，防止覆盖用户输入）
  useEffect(() => {
    if (!editing) setDraft(externalValue);
  }, [externalValue, editing]);

  // 进入编辑模式后自动聚焦并全选
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = useCallback((e) => {
    e?.stopPropagation?.();
    setDraft(externalValue);
    setEditing(true);
  }, [externalValue]);

  // onCommit(trimmedDraft) 由调用方提供，负责实际保存
  const commitEdit = useCallback((onCommit) => {
    const trimmed = typeof draft === "string" ? draft.trim() : draft;
    onCommit?.(trimmed);
    setEditing(false);
  }, [draft]);

  const cancelEdit = useCallback(() => {
    setDraft(externalValue);
    setEditing(false);
  }, [externalValue]);

  return { editing, draft, setDraft, startEdit, commitEdit, cancelEdit, inputRef };
}
