import React, { useState } from "react";
import { useTaskAttrs } from "@/context/DatabaseContext";
import Popover from "@/components/ui/Popover";
import { ATTR_TYPE_OPTIONS } from "@/utils/task/editorConstants";
import { attrName } from "@/utils/task/taskAttrUtils";
import AttrOptionsEditor from "@/pages/Tasks/AttrOptionsEditor";
import useConfirm from "@/hooks/common/useConfirm";
import { useLanguage } from "@/context/LanguageContext";

export default function AttrHeaderEditor({ attrDef, anchorEl, onClose }) {
  const { taskAttrs, addTaskAttr, updateTaskAttr, deleteTaskAttr, reorderTaskAttrs } = useTaskAttrs();
  const { t } = useLanguage();
  const [confirm, confirmDialog] = useConfirm();
  const isNew = !attrDef;

  // 内置列只有 nameKey，进编辑框先转成当前语言的文字（改名即变成用户自定义名）。
  const [name,    setName]    = useState(
    () => (attrDef ? attrName(t, attrDef) : t("tasks.attr.newName")),
  );
  const [type,    setType]    = useState(attrDef?.type ?? "text");
  const [unit,    setUnit]    = useState(attrDef?.unit ?? "");
  const [options, setOptions] = useState(() =>
    (attrDef?.options ?? []).map(o => ({ ...o }))
  );

  // 按 order 排序的完整 id 列表，用于左右移动重排序
  const orderedIds = [...taskAttrs].sort((a, b) => a.order - b.order).map(a => a.id);
  const curIdx = attrDef ? orderedIds.indexOf(attrDef.id) : -1;
  const canMoveLeft  = curIdx > 0;
  const canMoveRight = curIdx >= 0 && curIdx < orderedIds.length - 1;

  const move = (dir) => {
    const j = curIdx + dir;
    if (j < 0 || j >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[curIdx], next[j]] = [next[j], next[curIdx]];
    reorderTaskAttrs(next);
    onClose();
  };

  const hideColumn = () => {
    if (!attrDef) return;
    updateTaskAttr(attrDef.id, { visible: false });
    onClose();
  };

  const hasOptions = type === "select" || type === "multiselect";

  const handleSave = () => {
    const trimmed = name.trim() || attrName(t, attrDef) || t("tasks.attr.fallbackName");
    if (isNew) {
      addTaskAttr(
        trimmed,
        type,
        hasOptions ? options : undefined,
      );
    } else {
      // 改过名字就不再跟 i18n 走，清掉 nameKey。
      const patch = { name: trimmed, nameKey: undefined, type };
      if (type === "number") patch.unit = unit.trim() || undefined;
      if (hasOptions) patch.options = options;
      updateTaskAttr(attrDef.id, patch);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!attrDef) return;
    const ok = await confirm({
      title: t("tasks.attr.confirmDelete", { name: attrName(t, attrDef) }),
      message: t("tasks.attr.confirmDeleteDetail"),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    deleteTaskAttr(attrDef.id);
    onClose();
  };

  return (
    <Popover anchorEl={anchorEl} onClose={onClose}>
    <div className="attr-editor" onClick={e => e.stopPropagation()}>
      <div className="attr-editor-title">
        {isNew ? t("tasks.addAttr") : t("tasks.editAttr")}
      </div>

      {/* Name */}
      <div className="attr-editor-field">
        <label className="attr-editor-label">{t("tasks.attr.nameLabel")}</label>
        <input
          className="attr-editor-input"
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
          placeholder={t("tasks.attr.namePlaceholder")}
        />
      </div>

      {/* Type */}
      <div className="attr-editor-field">
        <label className="attr-editor-label">{t("tasks.attr.typeLabel")}</label>
        <div className="type-selector">
          {ATTR_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              className={`type-opt${type === opt.id ? " active" : ""}`}
              onClick={() => setType(opt.id)}
            >{t(opt.labelKey)}</button>
          ))}
        </div>
      </div>

      {/* Unit (number only) */}
      {type === "number" && (
        <div className="attr-editor-field">
          <label className="attr-editor-label">{t("tasks.attr.unitLabel")}</label>
          <input
            className="attr-editor-input attr-editor-input-sm"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder={t("tasks.attr.unitPlaceholder")}
          />
        </div>
      )}

      {/* Options (select / multiselect) */}
      {hasOptions && (
        <AttrOptionsEditor options={options} type={type} onChange={setOptions} />
      )}

      {/* Column actions (existing attrs only): reorder + hide */}
      {!isNew && (
        <div className="attr-editor-field">
          <label className="attr-editor-label">{t("tasks.attr.colActions")}</label>
          <div className="attr-col-actions">
            <button
              className="attr-col-btn"
              onClick={() => move(-1)}
              disabled={!canMoveLeft}
              title={t("tasks.attr.moveLeftTitle")}
            >{t("tasks.attr.moveLeft")}</button>
            <button
              className="attr-col-btn"
              onClick={() => move(1)}
              disabled={!canMoveRight}
              title={t("tasks.attr.moveRightTitle")}
            >{t("tasks.attr.moveRight")}</button>
            <button className="attr-col-btn" onClick={hideColumn} title={t("tasks.attr.hideTitle")}>{t("tasks.attr.hide")}</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="attr-editor-footer">
        <button className="attr-editor-save" onClick={handleSave}>
          {isNew ? t("todo.form.add") : t("reward.custom.save")}
        </button>
        {!isNew && (
          <button className="attr-editor-delete" onClick={handleDelete}>{t("common.delete")}</button>
        )}
        <button className="attr-editor-cancel" onClick={onClose}>{t("common.cancel")}</button>
      </div>

      {confirmDialog}
    </div>
    </Popover>
  );
}
