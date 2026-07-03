import React, { useState } from "react";
import { useTaskAttrs } from "@/context/DatabaseContext";
import Popover from "@/components/ui/Popover";
import { ATTR_TYPE_OPTIONS, ATTR_COLOR_SWATCHES } from "@/utils/task/editorConstants";

export default function AttrHeaderEditor({ attrDef, anchorEl, onClose }) {
  const { taskAttrs, addTaskAttr, updateTaskAttr, deleteTaskAttr, reorderTaskAttrs } = useTaskAttrs();
  const isNew = !attrDef;

  const [name,    setName]    = useState(attrDef?.name ?? "新属性");
  const [type,    setType]    = useState(attrDef?.type ?? "text");
  const [unit,    setUnit]    = useState(attrDef?.unit ?? "");
  const [options, setOptions] = useState(() =>
    (attrDef?.options ?? []).map(o => ({ ...o }))
  );
  const [openColorFor, setOpenColorFor] = useState(null);

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

  const addOption = () => {
    setOptions(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "选项",
        color: ATTR_COLOR_SWATCHES[prev.length % ATTR_COLOR_SWATCHES.length],
        ...(type === "select" ? { sortWeight: prev.length + 1 } : {}),
      },
    ]);
  };

  const removeOption = (id) => {
    setOptions(prev => prev.filter(o => o.id !== id));
    if (openColorFor === id) setOpenColorFor(null);
  };

  const patchOption = (id, patch) =>
    setOptions(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));

  const handleSave = () => {
    const trimmed = name.trim() || (attrDef?.name ?? "属性");
    if (isNew) {
      addTaskAttr(
        trimmed,
        type,
        hasOptions ? options : undefined,
      );
    } else {
      const patch = { name: trimmed, type };
      if (type === "number") patch.unit = unit.trim() || undefined;
      if (hasOptions) patch.options = options;
      updateTaskAttr(attrDef.id, patch);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!attrDef) return;
    if (window.confirm(`删除属性「${attrDef.name}」？所有任务的该字段数据将丢失。`)) {
      deleteTaskAttr(attrDef.id);
      onClose();
    }
  };

  return (
    <Popover anchorEl={anchorEl} onClose={onClose}>
    <div className="attr-editor" onClick={e => e.stopPropagation()}>
      <div className="attr-editor-title">{isNew ? "添加属性" : "编辑属性"}</div>

      {/* Name */}
      <div className="attr-editor-field">
        <label className="attr-editor-label">名称</label>
        <input
          className="attr-editor-input"
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
          placeholder="属性名称"
        />
      </div>

      {/* Type */}
      <div className="attr-editor-field">
        <label className="attr-editor-label">类型</label>
        <div className="type-selector">
          {ATTR_TYPE_OPTIONS.map(t => (
            <button
              key={t.id}
              className={`type-opt${type === t.id ? " active" : ""}`}
              onClick={() => setType(t.id)}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Unit (number only) */}
      {type === "number" && (
        <div className="attr-editor-field">
          <label className="attr-editor-label">单位（可选）</label>
          <input
            className="attr-editor-input attr-editor-input-sm"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="如：分钟、元、次"
          />
        </div>
      )}

      {/* Options (select / multiselect) */}
      {hasOptions && (
        <div className="attr-editor-field">
          <label className="attr-editor-label">选项</label>
          <div className="options-list">
            {options.map(opt => (
              <div key={opt.id} className="option-row">
                <button
                  className="option-color-swatch"
                  style={{ background: opt.color ?? "#9ca3af" }}
                  title="更改颜色"
                  onClick={() => setOpenColorFor(openColorFor === opt.id ? null : opt.id)}
                />
                <input
                  className="option-label-input"
                  value={opt.label}
                  onChange={e => patchOption(opt.id, { label: e.target.value })}
                  placeholder="选项名称"
                />
                <button className="option-remove" onClick={() => removeOption(opt.id)}>×</button>

                {/* Inline color swatches */}
                {openColorFor === opt.id && (
                  <div className="color-swatches" onClick={e => e.stopPropagation()}>
                    {ATTR_COLOR_SWATCHES.map(c => (
                      <button
                        key={c}
                        className={`color-dot${opt.color === c ? " selected" : ""}`}
                        style={{ background: c }}
                        onClick={() => { patchOption(opt.id, { color: c }); setOpenColorFor(null); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className="add-option-btn" onClick={addOption}>+ 添加选项</button>
          </div>
        </div>
      )}

      {/* Column actions (existing attrs only): reorder + hide */}
      {!isNew && (
        <div className="attr-editor-field">
          <label className="attr-editor-label">列操作</label>
          <div className="attr-col-actions">
            <button
              className="attr-col-btn"
              onClick={() => move(-1)}
              disabled={!canMoveLeft}
              title="左移此列"
            >← 左移</button>
            <button
              className="attr-col-btn"
              onClick={() => move(1)}
              disabled={!canMoveRight}
              title="右移此列"
            >右移 →</button>
            <button className="attr-col-btn" onClick={hideColumn} title="在任务库中隐藏此列">隐藏</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="attr-editor-footer">
        <button className="attr-editor-save" onClick={handleSave}>
          {isNew ? "添加" : "保存"}
        </button>
        {!isNew && (
          <button className="attr-editor-delete" onClick={handleDelete}>删除</button>
        )}
        <button className="attr-editor-cancel" onClick={onClose}>取消</button>
      </div>
    </div>
    </Popover>
  );
}
