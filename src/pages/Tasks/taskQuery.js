// 任务库的「对标 Notion」查询引擎：字段描述 + 运算符注册表 + 纯函数式筛选/排序。
// 设计目标：对所有属性（含自定义列）通用，规则形如 { field, op, value }，
// 与 UI 完全解耦，方便单测。运算符走「精简」路线（每种类型少而够用）。

const pad = (n) => String(n).padStart(2, "0");
const toYMD = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const str = (v) => (v == null ? "" : String(v));

export function isEmptyVal(v) {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

// ── 字段描述 ──
// 内置字段（任务名 / 状态 / 创建时间）+ 各库自定义列，统一成 { key, name, type, options, unit }。
export function buildQueryFields(attrs = []) {
  const builtin = [
    { key: "name", name: "任务名", type: "text", builtin: true },
    {
      key: "status", name: "状态", type: "select", builtin: true,
      options: [
        { id: "active",    label: "待办" },
        { id: "completed", label: "已完成" },
      ],
    },
    { key: "createdAt", name: "创建时间", type: "date", builtin: true },
  ];
  const attrFields = attrs.map(a => ({
    key: a.id, name: a.name, type: a.type, options: a.options ?? [], unit: a.unit,
  }));
  return [...builtin, ...attrFields];
}

// ── 运算符注册表（精简版）──
// input: "none" | "text" | "number" | "date" | "options"（options 的规则值是 id 数组）
const EMPTY_OPS = [
  { id: "is_empty",     label: "为空",   input: "none", test: (v) => isEmptyVal(v) },
  { id: "is_not_empty", label: "不为空", input: "none", test: (v) => !isEmptyVal(v) },
];

const OPS_BY_TYPE = {
  text: [
    { id: "contains",     label: "包含",   input: "text", test: (v, rv) => str(v).toLowerCase().includes(str(rv).toLowerCase()) },
    { id: "not_contains", label: "不包含", input: "text", test: (v, rv) => !str(v).toLowerCase().includes(str(rv).toLowerCase()) },
    ...EMPTY_OPS,
  ],
  select: [
    { id: "is_any_of", label: "是其一", input: "options", test: (v, rv) => Array.isArray(rv) && rv.includes(v) },
    ...EMPTY_OPS,
  ],
  multiselect: [
    { id: "has_any_of", label: "含其一", input: "options", test: (v, rv) => Array.isArray(v) && Array.isArray(rv) && v.some(x => rv.includes(x)) },
    ...EMPTY_OPS,
  ],
  date: [
    { id: "before", label: "早于", input: "date", test: (v, rv) => !isEmptyVal(v) && str(v) < str(rv) },
    { id: "after",  label: "晚于", input: "date", test: (v, rv) => !isEmptyVal(v) && str(v) > str(rv) },
    { id: "is",     label: "等于", input: "date", test: (v, rv) => str(v) === str(rv) },
    ...EMPTY_OPS,
  ],
  number: [
    { id: "eq", label: "=", input: "number", test: (v, rv) => Number(v) === Number(rv) },
    { id: "ne", label: "≠", input: "number", test: (v, rv) => Number(v) !== Number(rv) },
    { id: "gt", label: ">", input: "number", test: (v, rv) => !isEmptyVal(v) && Number(v) > Number(rv) },
    { id: "lt", label: "<", input: "number", test: (v, rv) => !isEmptyVal(v) && Number(v) < Number(rv) },
    ...EMPTY_OPS,
  ],
};

export function opsForType(type) {
  return OPS_BY_TYPE[type] ?? OPS_BY_TYPE.text;
}
export function getOp(field, opId) {
  return opsForType(field?.type).find(o => o.id === opId) ?? null;
}
export function defaultOpFor(field) {
  return opsForType(field?.type)[0].id;
}

// ── 取值 ──
// 筛选用值：日期统一成 YYYY-MM-DD 字符串，便于与 <input type=date> 比较。
function getFilterValue(todo, field) {
  switch (field.key) {
    case "name":      return todo.text ?? "";
    case "status":    return todo.completed ? "completed" : "active";
    case "createdAt": return todo.createdAt ? toYMD(todo.createdAt) : "";
    default:          return todo.attrs?.[field.key];
  }
}
// 排序用值：createdAt 用原始时间戳保留同日次序；其余同筛选。
function getSortValue(todo, field) {
  switch (field.key) {
    case "name":      return todo.text ?? "";
    case "status":    return todo.completed ? "completed" : "active";
    case "createdAt": return todo.createdAt ?? 0;
    default:          return todo.attrs?.[field.key];
  }
}

// 选项排序权重：优先用 sortWeight（如优先级），否则退化到选项定义顺序。未知选项排最后。
function optionRank(field, optId) {
  const opts = field.options ?? [];
  const i = opts.findIndex(o => o.id === optId);
  if (i < 0) return Number.POSITIVE_INFINITY;
  return opts[i].sortWeight ?? i;
}

function compareByType(a, b, field) {
  switch (field.type) {
    case "number":
      return Number(a) - Number(b);
    case "date":
      return typeof a === "number" && typeof b === "number"
        ? a - b
        : str(a).localeCompare(str(b));
    case "select":
      return optionRank(field, a) - optionRank(field, b);
    case "multiselect": {
      const ra = Math.min(...a.map(id => optionRank(field, id)));
      const rb = Math.min(...b.map(id => optionRank(field, id)));
      return ra - rb;
    }
    default: // text
      return str(a).localeCompare(str(b), "zh");
  }
}

// 规则是否「完整」：有字段、有运算符，且需要值的运算符已填值。
function ruleReady(rule, fieldMap) {
  const field = fieldMap[rule.field];
  if (!field) return false;
  const op = getOp(field, rule.op);
  if (!op) return false;
  if (op.input === "none") return true;
  if (op.input === "options") return Array.isArray(rule.value) && rule.value.length > 0;
  return rule.value != null && String(rule.value).trim() !== "";
}

export function applyFilter(todos, filter, fieldMap) {
  const rules = (filter?.rules ?? []).filter(r => ruleReady(r, fieldMap));
  if (!rules.length) return todos;
  const orMode = filter?.conjunction === "or";
  return todos.filter(t => {
    const results = rules.map(r => {
      const field = fieldMap[r.field];
      const op = getOp(field, r.op);
      return op.test(getFilterValue(t, field), r.value, field);
    });
    return orMode ? results.some(Boolean) : results.every(Boolean);
  });
}

export function applySort(todos, sorts, fieldMap) {
  const active = (sorts ?? []).filter(s => fieldMap[s.field]);
  if (!active.length) return todos;
  return todos
    .map((t, i) => [t, i])
    .sort(([ta, ia], [tb, ib]) => {
      for (const s of active) {
        const field = fieldMap[s.field];
        const va = getSortValue(ta, field);
        const vb = getSortValue(tb, field);
        const ea = isEmptyVal(va), eb = isEmptyVal(vb);
        let cmp;
        if (ea && eb) cmp = 0;
        else if (ea) cmp = 1;        // 空值恒排最后，不受升降序影响
        else if (eb) cmp = -1;
        else {
          cmp = compareByType(va, vb, field);
          if (s.dir === "desc") cmp = -cmp;
        }
        if (cmp !== 0) return cmp;
      }
      return ia - ib; // 稳定排序
    })
    .map(([t]) => t);
}

// 组合：搜索（任务名 + 所有文本类字段）→ 筛选 → 排序。
export function applyQuery(todos, { search, filter, sorts } = {}, fields = []) {
  const fieldMap = Object.fromEntries(fields.map(f => [f.key, f]));
  let list = todos;

  if (search?.trim()) {
    const q = search.toLowerCase();
    const textFields = fields.filter(f => f.type === "text");
    list = list.filter(t => {
      const hay = [t.text, ...textFields.map(f => getFilterValue(t, f))]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  list = applyFilter(list, filter, fieldMap);
  list = applySort(list, sorts, fieldMap);
  return list;
}
