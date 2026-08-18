import React, { useState } from "react";
import useEditMode from "@/hooks/common/useEditMode";
import { useLanguage } from "@/context/LanguageContext";
import { addTag, removeTag } from "@/pages/Memo/memoTags";
import { formatTimestamp } from "@/utils/time";

// 时间线上的单条备忘。手动备忘与专注随记都可编辑 / 删除 / 打标签，
// 仅用徽章区分来源；改写按 item.source 路由到对应存储。
// 行内编辑复用通用 useEditMode（聚焦、草稿、提交 / 取消）；
// 标签增删用 memoTags 纯函数算出新数组后交给 onSetTags 落库。
export default function MemoItem({
  item,
  selected,
  onToggleSelect,
  onUpdate,
  onRemove,
  onSetTags,
  onTagClick,
  activeTag,
}) {
  const { t } = useLanguage();
  const isFocus = item.source === "focus";
  const edit = useEditMode(item.text);
  const tags = item.tags || [];

  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  const save = () =>
    edit.commitEdit((text) => {
      if (text) onUpdate(item.id, text, item.source);
    });

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") edit.cancelEdit();
  };

  const commitTag = () => {
    const next = addTag(tags, tagDraft);
    if (next.length !== tags.length) onSetTags(item.id, next, item.source);
    setTagDraft("");
    setAddingTag(false);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTag();
    }
    if (e.key === "Escape") {
      setTagDraft("");
      setAddingTag(false);
    }
  };

  const dropTag = (tag) => onSetTags(item.id, removeTag(tags, tag), item.source);

  return (
    <li
      className={`memo-item${isFocus ? " focus" : ""}${selected ? " selected" : ""}`}
      data-highlight-id={item.id}
    >
      <div className="memo-item-head">
        <input
          type="checkbox"
          className="memo-select-check"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          title={t("memo.item.selectHint")}
        />
        <span className={`memo-badge${isFocus ? " focus" : ""}`}>
          {isFocus ? t("memo.item.badgeFocus") : t("memo.item.badgeManual")}
        </span>
        <span className="memo-item-time">{formatTimestamp(item.ts)}</span>
        {!edit.editing && (
          <span className="memo-item-actions">
            <button type="button" className="memo-item-btn" onClick={edit.startEdit}>
              {t("memo.item.edit")}
            </button>
            <button
              type="button"
              className="memo-item-btn danger"
              onClick={() => onRemove(item.id, item.source)}
            >
              {t("memo.item.delete")}
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
              {t("memo.item.save")}
            </button>
            <button type="button" className="memo-edit-cancel" onClick={edit.cancelEdit}>
              {t("memo.item.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <p className="memo-item-text">{item.text}</p>
      )}

      {/* 标签行：已有标签 + 添加入口 */}
      {!edit.editing && (
        <div className="memo-tags">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`memo-tag${activeTag === tag ? " active" : ""}`}
            >
              <button
                type="button"
                className="memo-tag-label"
                onClick={() => onTagClick?.(tag)}
                title={t("memo.tag.filterBy")}
              >
                #{tag}
              </button>
              <button
                type="button"
                className="memo-tag-remove"
                onClick={() => dropTag(tag)}
                title={t("memo.tag.remove")}
              >
                ×
              </button>
            </span>
          ))}

          {addingTag ? (
            <input
              className="memo-tag-input"
              value={tagDraft}
              autoFocus
              maxLength={20}
              placeholder={t("memo.tag.placeholder")}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={commitTag}
            />
          ) : (
            <button
              type="button"
              className="memo-tag-add"
              onClick={() => setAddingTag(true)}
            >
              {t("memo.tag.add")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
