import React from "react";
import Popover from "@/components/ui/Popover";
import { opsForType, getOp } from "@/pages/Tasks/taskQuery";
import { attrName, optionLabel } from "@/utils/task/taskAttrUtils";
import { useLanguage } from "@/context/LanguageContext";

// 单条规则的值输入：按运算符的 input 形态渲染（无 / 文本 / 数字 / 日期 / 选项多选）。
function RuleValueInput({ field, op, value, onChange, t }) {
  if (!op || op.input === "none") return <span className="query-value-spacer" />;

  if (op.input === "options") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (id) =>
      onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    return (
      <div className="query-value-opts">
        {(field.options ?? []).map(o => (
          <button
            key={o.id}
            type="button"
            className={`query-opt-chip${selected.includes(o.id) ? " active" : ""}`}
            style={o.color ? { "--pill": o.color } : undefined}
            onClick={() => toggle(o.id)}
          >
            {o.icon ? `${o.icon} ${optionLabel(t, o)}` : optionLabel(t, o)}
          </button>
        ))}
      </div>
    );
  }

  const type = op.input === "number" ? "number" : op.input === "date" ? "date" : "text";
  return (
    <input
      className="query-value-input"
      type={type}
      value={value ?? ""}
      placeholder={op.input === "text" ? t("tasks.filter.valuePlaceholder") : undefined}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// 筛选弹层：多条规则（字段 + 运算符 + 值）+ 且/或 连接词，对标 Notion。
export default function FilterPopover({ anchorEl, onClose, fields, filter, actions }) {
  const { t } = useLanguage();
  const { rules, conjunction } = filter;
  const { addRule, changeRuleField, changeRuleOp, updateRule, removeRule, setConjunction, clearFilter } = actions;

  return (
    <Popover anchorEl={anchorEl} onClose={onClose} className="query-popover-layer">
      <div className="query-popover">
        {rules.length === 0 && <div className="query-empty">{t("tasks.filter.empty")}</div>}

        {rules.map((rule, i) => {
          const field = fields.find(f => f.key === rule.field) ?? fields[0];
          const op = getOp(field, rule.op);
          return (
            <div className="query-rule" key={rule.id}>
              <span className="query-conj">
                {i === 0 ? (
                  t("tasks.filter.where")
                ) : i === 1 ? (
                  <select
                    className="query-conj-select"
                    value={conjunction}
                    onChange={e => setConjunction(e.target.value)}
                  >
                    <option value="and">{t("tasks.filter.and")}</option>
                    <option value="or">{t("tasks.filter.or")}</option>
                  </select>
                ) : (
                  conjunction === "or" ? t("tasks.filter.or") : t("tasks.filter.and")
                )}
              </span>

              <select
                className="query-select query-field-select"
                value={rule.field}
                onChange={e => changeRuleField(rule.id, e.target.value)}
              >
                {fields.map(f => <option key={f.key} value={f.key}>{attrName(t, f)}</option>)}
              </select>

              <select
                className="query-select query-op-select"
                value={rule.op}
                onChange={e => changeRuleOp(rule.id, rule.field, e.target.value)}
              >
                {opsForType(field.type).map(o => (
                  <option key={o.id} value={o.id}>{o.labelKey ? t(o.labelKey) : o.label}</option>
                ))}
              </select>

              <RuleValueInput
                field={field}
                op={op}
                value={rule.value}
                onChange={v => updateRule(rule.id, { value: v })}
                t={t}
              />

              <button className="query-rule-remove" title={t("tasks.query.removeRule")} onClick={() => removeRule(rule.id)}>×</button>
            </div>
          );
        })}

        <div className="query-footer">
          <button className="query-add-btn" onClick={addRule}>{t("tasks.filter.addRule")}</button>
          {rules.length > 0 && (
            <button className="query-clear-btn" onClick={clearFilter}>{t("tasks.query.clearAll")}</button>
          )}
        </div>
      </div>
    </Popover>
  );
}
