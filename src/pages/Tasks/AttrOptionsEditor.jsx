import React, { useState } from "react";
import { ATTR_COLOR_SWATCHES } from "@/utils/task/editorConstants";

// select / multiselect 属性的「选项」编辑器：增删改选项 + 每个选项的行内取色。
// 受控组件（options 由父级持有以便保存），仅自管颜色弹窗的开合状态，从属性编辑器里拆出。
export default function AttrOptionsEditor({ options, type, onChange }) {
  const [openColorFor, setOpenColorFor] = useState(null);

  const addOption = () =>
    onChange([
      ...options,
      {
        id: crypto.randomUUID(),
        label: "选项",
        color: ATTR_COLOR_SWATCHES[options.length % ATTR_COLOR_SWATCHES.length],
        ...(type === "select" ? { sortWeight: options.length + 1 } : {}),
      },
    ]);

  const removeOption = (id) => {
    onChange(options.filter((o) => o.id !== id));
    if (openColorFor === id) setOpenColorFor(null);
  };

  const patchOption = (id, patch) =>
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  return (
    <div className="attr-editor-field">
      <label className="attr-editor-label">选项</label>
      <div className="options-list">
        {options.map((opt) => (
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
              onChange={(e) => patchOption(opt.id, { label: e.target.value })}
              placeholder="选项名称"
            />
            <button className="option-remove" onClick={() => removeOption(opt.id)}>×</button>

            {/* 行内取色 */}
            {openColorFor === opt.id && (
              <div className="color-swatches" onClick={(e) => e.stopPropagation()}>
                {ATTR_COLOR_SWATCHES.map((c) => (
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
  );
}
