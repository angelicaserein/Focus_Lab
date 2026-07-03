import { TASK_TYPE_OPTIONS } from "@/utils/scenario/scenarioConstants";

export const TASK_ATTR_DEFAULTS = [
  {
    id: "priority",
    name: "优先级",
    type: "select",
    system: true,
    visible: true,
    order: 0,
    options: [
      { id: "urgent", label: "紧急", color: "#ef4444", sortWeight: 4 },
      { id: "high",   label: "高",   color: "#f97316", sortWeight: 3 },
      { id: "medium", label: "中",   color: "#3b82f6", sortWeight: 2 },
      { id: "low",    label: "低",   color: "#9ca3af", sortWeight: 1 },
    ],
  },
  {
    id: "tags",
    name: "标签",
    type: "multiselect",
    system: true,
    visible: true,
    order: 1,
    options: TASK_TYPE_OPTIONS.map(({ id, label, icon }) => ({ id, label, icon })),
  },
  {
    id: "dueDate",
    name: "截止日期",
    type: "date",
    system: true,
    visible: true,
    order: 2,
  },
  {
    id: "estimatedMins",
    name: "预计时长",
    type: "number",
    system: true,
    visible: true,
    order: 3,
    unit: "分",
  },
  {
    id: "notes",
    name: "备注",
    type: "text",
    system: true,
    visible: true,
    order: 4,
  },
];
