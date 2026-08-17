import React from "react";
import { TASK_TYPE_OPTIONS } from "@/utils/scenario/scenarioConstants";
import { useLanguage } from "@/context/LanguageContext";
import { optionLabel } from "@/utils/task/taskAttrUtils";
import desktop from "@/utils/desktop/desktopBridge";

const TAG_MAP = Object.fromEntries(TASK_TYPE_OPTIONS.map((o) => [o.id, o]));

/**
 * 非编辑态的任务展示层：复选框 + 文本 + 标签 + 焦点样式。
 * 所有状态和回调由父组件 TodoItem 传入。
 */
export default function TodoItemDisplay({ todo, recurringDays, todoTags, onToggle }) {
  const { t } = useLanguage();
  return (
    <>
      <label className="checkbox-wrap">
        <input
          className="native-checkbox"
          type="checkbox"
          checked={!!todo.completed}
          onChange={onToggle}
          aria-label={t("todo.markCompleteAria", { text: todo.text })}
        />
        <span className={`custom-checkbox ${todo.completed ? "checked" : ""}`} />
      </label>

      <div className="todo-text-wrap">
        <div className={`todo-text ${todo.completed ? "completed" : ""}`}>
          {recurringDays.length > 0 && (
            <span className="recurring-icon" title={t("todo.recurringDaysTitle", { days: recurringDays.join(",") })}>↺</span>
          )}
          {todo.text}
        </div>
        {/* 拖文件进来建的任务：点一下用系统默认程序打开那个文件。
            「想到该改论文」和「真的开始改」之间隔着「找到那个文件」，
            这个按钮就是把那一步省掉——也正是网页版做不到的那一步。
            文件被移走 / 删掉时 openPath 会返回一句原因，用 title 交代，不弹窗打断。 */}
        {todo.filePath && (
          <button
            type="button"
            className="todo-file-open"
            title={todo.filePath}
            onClick={async (e) => {
              e.stopPropagation();
              // 按钮引用要在 await 之前拿：事件处理函数同步返回之后 currentTarget 就是 null 了
              const btn = e.currentTarget;
              const err = await desktop.openPath(todo.filePath);
              if (err) btn.title = t("todo.item.openFileFailed");
            }}
          >
            📎 {t("todo.item.openFile")}
          </button>
        )}
        {todoTags.length > 0 && (
          <div className="todo-tags">
            {todoTags.map((id) => TAG_MAP[id] && (
              <span key={id} className="todo-tag-chip">
                {TAG_MAP[id].icon} {optionLabel(t, TAG_MAP[id])}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
