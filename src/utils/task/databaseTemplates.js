import { TASK_ATTR_DEFAULTS } from "@/utils/task/taskAttrDefaults";

/**
 * 新建 database 时可选的模板。
 * - attrs 形状与 TaskAttr 一致；使用时由 DatabaseContext 做深拷贝。
 * - 模板里的列均 system: false（完全可自定义）。
 * - 保留 priority / tags / dueDate 等列 id，使 DDL、专注页等依赖这些 id 约定的功能仍生效。
 * 后续可继续往这里追加更多模板。
 */
export const DATABASE_TEMPLATES = [
  {
    id: "blank",
    nameKey: "tasks.tpl.blank",
    descKey: "tasks.tpl.blankDesc",
    attrs: [],
  },
  {
    id: "classic",
    nameKey: "tasks.tpl.classic",
    descKey: "tasks.tpl.classicDesc",
    attrs: TASK_ATTR_DEFAULTS.map(a => ({ ...a, system: false })),
  },
];

export const DEFAULT_TEMPLATE_ID = "blank";
