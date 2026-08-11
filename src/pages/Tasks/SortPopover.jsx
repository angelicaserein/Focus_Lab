import React from "react";
import Popover from "@/components/ui/Popover";
import { attrName } from "@/utils/task/taskAttrUtils";
import { useLanguage } from "@/context/LanguageContext";

// 排序弹层：多级排序（字段 + 升/降序），每个字段至多一条，对标 Notion。
export default function SortPopover({ anchorEl, onClose, fields, sorts, actions }) {
  const { t } = useLanguage();
  const { addSort, updateSort, removeSort, clearSort } = actions;
  const usedKeys = new Set(sorts.map(s => s.field));
  const canAdd = sorts.length < fields.length;

  return (
    <Popover anchorEl={anchorEl} onClose={onClose} className="query-popover-layer">
      <div className="query-popover">
        {sorts.length === 0 && <div className="query-empty">{t("tasks.sort.empty")}</div>}

        {sorts.map((s, i) => (
          <div className="query-rule" key={s.field}>
            <select
              className="query-select query-field-select"
              value={s.field}
              onChange={e => updateSort(i, { field: e.target.value })}
            >
              {fields
                .filter(f => f.key === s.field || !usedKeys.has(f.key))
                .map(f => <option key={f.key} value={f.key}>{attrName(t, f)}</option>)}
            </select>

            <div className="query-dir-toggle">
              <button
                className={`query-dir-btn${s.dir === "asc" ? " active" : ""}`}
                onClick={() => updateSort(i, { dir: "asc" })}
              >{t("tasks.sort.asc")}</button>
              <button
                className={`query-dir-btn${s.dir === "desc" ? " active" : ""}`}
                onClick={() => updateSort(i, { dir: "desc" })}
              >{t("tasks.sort.desc")}</button>
            </div>

            <button className="query-rule-remove" title={t("tasks.query.removeRule")} onClick={() => removeSort(i)}>×</button>
          </div>
        ))}

        <div className="query-footer">
          <button className="query-add-btn" onClick={addSort} disabled={!canAdd}>{t("tasks.sort.addRule")}</button>
          {sorts.length > 0 && (
            <button className="query-clear-btn" onClick={clearSort}>{t("tasks.query.clearAll")}</button>
          )}
        </div>
      </div>
    </Popover>
  );
}
