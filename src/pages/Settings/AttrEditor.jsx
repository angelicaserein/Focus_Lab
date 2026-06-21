import React, { useState } from "react";
import { useTaskAttrs } from "../../context/TaskAttrContext";
import { ATTR_TYPE_OPTIONS, ATTR_COLOR_SWATCHES } from "../../utils/editorConstants";

const NEEDS_OPTIONS = ["select", "multiselect"];

export default function AttrEditor({ attr, mode, onDone }) {
  const { addTaskAttr, updateTaskAttr } = useTaskAttrs();

  const [name,    setName]    = useState(attr?.name ?? "");
  const [type,    setType]    = useState(attr?.type ?? "select");
  const [options, setOptions] = useState(
    attr?.options?.map(o => ({ ...o })) ?? []
  );
  const [unit,    setUnit]    = useState(attr?.unit ?? "");

  const isEdit   = mode === "edit";
  const isSystem = attr?.system;
  const showOpts = NEEDS_OPTIONS.includes(type);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const patch = {
      name: trimmed,
      ...(showOpts ? { options } : {}),
      ...(type === "number" ? { unit } : {}),
    };
    if (isEdit) {
      updateTaskAttr(attr.id, { ...patch, ...(!isSystem ? { type } : {}) });
    } else {
      addTaskAttr(trimmed, type, showOpts ? options : undefined);
    }
    onDone();
  }

  function addOption() {
    setOptions(prev => [
      ...prev,
      { id: crypto.randomUUID(), label: "", color: ATTR_COLOR_SWATCHES[prev.length % ATTR_COLOR_SWATCHES.length] },
    ]);
  }

  function updateOption(idx, patch) {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, ...patch } : o));
  }

  function removeOption(idx) {
    setOptions(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="attr-editor">
      <div className="attr-editor-row">
        <label className="attr-editor-label">名称</label>
        <input
          className="attr-editor-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="属性名称"
          autoFocus
        />
      </div>

      <div className="attr-editor-row">
        <label className="attr-editor-label">类型</label>
        <select
          className="attr-editor-select"
          value={type}
          onChange={e => setType(e.target.value)}
          disabled={isSystem && isEdit}
        >
          {ATTR_TYPE_OPTIONS.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {type === "number" && (
        <div className="attr-editor-row">
          <label className="attr-editor-label">单位</label>
          <input
            className="attr-editor-input attr-editor-input-sm"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="如：分、kg…"
          />
        </div>
      )}

      {showOpts && (
        <div className="attr-editor-opts">
          <div className="attr-editor-opts-label">选项</div>
          {options.map((opt, idx) => (
            <div key={opt.id} className="attr-opt-row">
              <div className="attr-opt-swatches">
                {ATTR_COLOR_SWATCHES.map(c => (
                  <button
                    key={c}
                    className={`attr-swatch${opt.color === c ? " selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => updateOption(idx, { color: c })}
                    title={c}
                  />
                ))}
              </div>
              <input
                className="attr-editor-input"
                value={opt.label}
                onChange={e => updateOption(idx, { label: e.target.value })}
                placeholder="选项名称"
              />
              <button
                className="attr-opt-del"
                onClick={() => removeOption(idx)}
                title="删除选项"
              >×</button>
            </div>
          ))}
          <button className="attr-add-opt-btn" onClick={addOption}>+ 添加选项</button>
        </div>
      )}

      <div className="attr-editor-actions">
        <button className="attr-editor-save" onClick={handleSave}>
          {isEdit ? "保存" : "添加"}
        </button>
        <button className="attr-editor-cancel" onClick={onDone}>取消</button>
      </div>
    </div>
  );
}
