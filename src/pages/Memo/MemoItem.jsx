import React from "react";
import useEditMode from "@/hooks/common/useEditMode";
import { formatTimestamp } from "@/utils/time";

// 时间线上的单条备忘。手动条目可编辑 / 删除，专注随记只读。
// 行内编辑复用通用 useEditMode（聚焦、草稿、提交 / 取消）。
export default function MemoItem({ item, selected, onToggleSelect, onUpdate, onRemove }) {
  const isFocus = item.source === "focus";
  const edit = useEditMode(item.text);

  const save = () =>
    edit.commitEdit((text) => {
      if (text) onUpdate(item.id, text);
    });

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") edit.cancelEdit();
  };

  return (
    <li className={`memo-item${isFocus ? " focus" : ""}${selected ? " selected" : ""}`}>
      <div className="memo-item-head">
        <input
          type="checkbox"
          className="memo-select-check"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          title="选中以整理成任务"
        />
        <span className={`memo-badge${isFocus ? " focus" : ""}`}>
          {isFocus ? "⛯ 专注随记" : "✎ 手动"}
        </span>
        <span className="memo-item-time">{formatTimestamp(item.ts)}</span>
        {!isFocus && !edit.editing && (
          <span className="memo-item-actions">
            <button type="button" className="memo-item-btn" onClick={edit.startEdit}>
              编辑
            </button>
            <button
              type="button"
              className="memo-item-btn danger"
              onClick={() => onRemove(item.id)}
            >
              删除
            </button>
          </span>
        )}
      </div>

      {edit.editing ? (
        <div className="memo-edit">
          <textarea
            ref={edit.inputRef}
            className="memo-edit-input"
            rows={3}
            value={edit.draft}
            onChange={(e) => edit.setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="memo-edit-actions">
            <button
              type="button"
              className="memo-edit-save"
              onClick={save}
              disabled={!edit.draft.trim()}
            >
              保存
            </button>
            <button type="button" className="memo-edit-cancel" onClick={edit.cancelEdit}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <p className="memo-item-text">{item.text}</p>
      )}
    </li>
  );
}
