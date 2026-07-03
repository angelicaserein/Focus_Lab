import React from "react";
import Popover from "@/components/ui/Popover";
import { opsForType, getOp } from "@/pages/Tasks/taskQuery";

// 单条规则的值输入：按运算符的 input 形态渲染（无 / 文本 / 数字 / 日期 / 选项多选）。
function RuleValueInput({ field, op, value, onChange }) {
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
            {o.icon ? `${o.icon} ${o.label}` : o.label}
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
      placeholder={op.input === "text" ? "值…" : undefined}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// 筛选弹层：多条规则（字段 + 运算符 + 值）+ 且/或 连接词，对标 Notion。
export default function FilterPopover({ anchorEl, onClose, fields, filter, actions }) {
  const { rules, conjunction } = filter;
  const { addRule, changeRuleField, changeRuleOp, updateRule, removeRule, setConjunction, clearFilter } = actions;

  return (
    <Popover anchorEl={anchorEl} onClose={onClose} className="query-popover-layer">
      <div className="query-popover">
        {rules.length === 0 && <div className="query-empty">没有筛选条件</div>}

        {rules.map((rule, i) => {
          const field = fields.find(f => f.key === rule.field) ?? fields[0];
          const op = getOp(field, rule.op);
          return (
            <div className="query-rule" key={rule.id}>
              <span className="query-conj">
                {i === 0 ? (
                  "满足"
                ) : i === 1 ? (
                  <select
                    className="query-conj-select"
                    value={conjunction}
                    onChange={e => setConjunction(e.target.value)}
                  >
                    <option value="and">且</option>
                    <option value="or">或</option>
                  </select>
                ) : (
                  conjunction === "or" ? "或" : "且"
                )}
              </span>

              <select
                className="query-select query-field-select"
                value={rule.field}
                onChange={e => changeRuleField(rule.id, e.target.value)}
              >
                {fields.map(f => <option key={f.key} value={f.key}>{f.name}</option>)}
              </select>

              <select
                className="query-select query-op-select"
                value={rule.op}
                onChange={e => changeRuleOp(rule.id, rule.field, e.target.value)}
              >
                {opsForType(field.type).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>

              <RuleValueInput
                field={field}
                op={op}
                value={rule.value}
                onChange={v => updateRule(rule.id, { value: v })}
              />

              <button className="query-rule-remove" title="删除此条" onClick={() => removeRule(rule.id)}>×</button>
            </div>
          );
        })}

        <div className="query-footer">
          <button className="query-add-btn" onClick={addRule}>+ 添加筛选</button>
          {rules.length > 0 && (
            <button className="query-clear-btn" onClick={clearFilter}>删除全部</button>
          )}
        </div>
      </div>
    </Popover>
  );
}
