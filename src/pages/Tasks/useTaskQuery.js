import { useCallback, useState } from "react";
import { defaultOpFor, getOp } from "@/pages/Tasks/taskQuery";

// 任务库查询的 UI 状态（对标 Notion）：搜索 + 筛选（多规则 + 且/或）+ 多级排序。
// 只管「用户选了什么」；据此算可见列表的纯逻辑在 taskQuery.js。
// fields 用于给新规则/排序挑默认字段与默认运算符。
export default function useTaskQuery(fields) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ conjunction: "and", rules: [] });
  const [sorts,  setSorts]  = useState([]);

  // ── 筛选规则 ──
  const addRule = useCallback(() => {
    const field = fields[0];
    if (!field) return;
    setFilter(f => ({
      ...f,
      rules: [...f.rules, { id: crypto.randomUUID(), field: field.key, op: defaultOpFor(field), value: undefined }],
    }));
  }, [fields]);

  const updateRule = useCallback((id, patch) => {
    setFilter(f => ({
      ...f,
      rules: f.rules.map(r => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  // 换字段：重置为该类型的默认运算符与空值。
  const changeRuleField = useCallback((id, fieldKey) => {
    const field = fields.find(x => x.key === fieldKey);
    if (!field) return;
    updateRule(id, { field: fieldKey, op: defaultOpFor(field), value: undefined });
  }, [fields, updateRule]);

  // 换运算符：若输入形态变化则清空值（如从「包含」切到「为空」）。
  const changeRuleOp = useCallback((id, fieldKey, opId) => {
    const field = fields.find(x => x.key === fieldKey);
    const prevRule = filter.rules.find(r => r.id === id);
    const prevOp = field && prevRule ? getOp(field, prevRule.op) : null;
    const nextOp = field ? getOp(field, opId) : null;
    const keepValue = prevOp && nextOp && prevOp.input === nextOp.input;
    updateRule(id, { op: opId, ...(keepValue ? {} : { value: undefined }) });
  }, [fields, filter.rules, updateRule]);

  const removeRule    = useCallback((id) => setFilter(f => ({ ...f, rules: f.rules.filter(r => r.id !== id) })), []);
  const setConjunction = useCallback((c) => setFilter(f => ({ ...f, conjunction: c })), []);
  const clearFilter   = useCallback(() => setFilter({ conjunction: "and", rules: [] }), []);

  // ── 排序（每个字段至多一条，形如 Notion）──
  const addSort = useCallback(() => {
    setSorts(prev => {
      const used = new Set(prev.map(s => s.field));
      const field = fields.find(f => !used.has(f.key));
      return field ? [...prev, { field: field.key, dir: "asc" }] : prev;
    });
  }, [fields]);

  const updateSort = useCallback((index, patch) =>
    setSorts(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s))), []);
  const removeSort = useCallback((index) =>
    setSorts(prev => prev.filter((_, i) => i !== index)), []);
  const clearSort  = useCallback(() => setSorts([]), []);

  // 表头点击：把该字段设为首要排序；已是首要则切换升降序。
  const handleSortClick = useCallback((fieldKey) => {
    setSorts(prev => {
      const idx = prev.findIndex(s => s.field === fieldKey);
      if (idx === 0) return [{ ...prev[0], dir: prev[0].dir === "asc" ? "desc" : "asc" }, ...prev.slice(1)];
      if (idx > 0) return [prev[idx], ...prev.filter((_, i) => i !== idx)];
      return [{ field: fieldKey, dir: "asc" }, ...prev];
    });
  }, []);

  const arrow = useCallback((fieldKey) => {
    const s = sorts.find(x => x.field === fieldKey);
    return s ? (s.dir === "asc" ? " ↑" : " ↓") : "";
  }, [sorts]);

  return {
    search, setSearch,
    filter, addRule, updateRule, changeRuleField, changeRuleOp, removeRule, setConjunction, clearFilter,
    sorts, addSort, updateSort, removeSort, clearSort,
    handleSortClick, arrow,
    query: { search, filter, sorts },
  };
}
