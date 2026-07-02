import React from "react";
import Popover from "../../components/Popover";

// 排序弹层：多级排序（字段 + 升/降序），每个字段至多一条，对标 Notion。
export default function SortPopover({ anchorEl, onClose, fields, sorts, actions }) {
  const { addSort, updateSort, removeSort, clearSort } = actions;
  const usedKeys = new Set(sorts.map(s => s.field));
  const canAdd = sorts.length < fields.length;

  return (
    <Popover anchorEl={anchorEl} onClose={onClose} className="query-popover-layer">
      <div className="query-popover">
        {sorts.length === 0 && <div className="query-empty">没有排序规则</div>}

        {sorts.map((s, i) => (
          <div className="query-rule" key={s.field}>
            <select
              className="query-select query-field-select"
              value={s.field}
              onChange={e => updateSort(i, { field: e.target.value })}
            >
              {fields
                .filter(f => f.key === s.field || !usedKeys.has(f.key))
                .map(f => <option key={f.key} value={f.key}>{f.name}</option>)}
            </select>

            <div className="query-dir-toggle">
              <button
                className={`query-dir-btn${s.dir === "asc" ? " active" : ""}`}
                onClick={() => updateSort(i, { dir: "asc" })}
              >升序 ↑</button>
              <button
                className={`query-dir-btn${s.dir === "desc" ? " active" : ""}`}
                onClick={() => updateSort(i, { dir: "desc" })}
              >降序 ↓</button>
            </div>

            <button className="query-rule-remove" title="删除此条" onClick={() => removeSort(i)}>×</button>
          </div>
        ))}

        <div className="query-footer">
          <button className="query-add-btn" onClick={addSort} disabled={!canAdd}>+ 添加排序</button>
          {sorts.length > 0 && (
            <button className="query-clear-btn" onClick={clearSort}>删除全部</button>
          )}
        </div>
      </div>
    </Popover>
  );
}
