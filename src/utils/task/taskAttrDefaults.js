import { TASK_TYPE_OPTIONS } from "@/utils/scenario/scenarioConstants";

export const TASK_ATTR_DEFAULTS = [
  {
    id: "priority",
    nameKey: "tasks.attr.priority",
    type: "select",
    system: true,
    visible: true,
    order: 0,
    // 艾森豪威尔四象限（紧急 × 重要），替代原来的线性 紧急/高/中/低。
    // sortWeight 保留：重要且紧急最高，供排序 / 情景推荐沿用。
    options: [
      { id: "urgent_important", labelKey: "tasks.priority.urgentImportant", color: "#ef4444", sortWeight: 4 },
      { id: "important",        labelKey: "tasks.priority.important",       color: "#3b82f6", sortWeight: 3 },
      { id: "urgent",           labelKey: "tasks.priority.urgent",          color: "#f97316", sortWeight: 2 },
      { id: "trivial",          labelKey: "tasks.priority.trivial",         color: "#9ca3af", sortWeight: 1 },
    ],
  },
  {
    id: "tags",
    nameKey: "tasks.attr.tags",
    type: "multiselect",
    system: true,
    visible: true,
    order: 1,
    options: TASK_TYPE_OPTIONS.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })),
  },
  {
    id: "dueDate",
    nameKey: "tasks.attr.dueDate",
    type: "date",
    system: true,
    visible: true,
    order: 2,
  },
  {
    id: "notes",
    nameKey: "tasks.attr.notes",
    type: "text",
    system: true,
    visible: true,
    order: 3,
  },
];
