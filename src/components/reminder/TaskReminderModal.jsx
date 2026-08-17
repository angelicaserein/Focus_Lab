import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/context/TodoContext";
import { useLanguage } from "@/context/LanguageContext";
import { collectTodayTasks } from "@/utils/taskReminderUtils";
import { countdownLabel, countdownClass } from "@/utils/ddlUtils";
import "@/components/ddl/DDLReminderModal.css";
import "./TaskReminderModal.css";

// 进站/PWA 启动时的「今天要做什么」提醒弹窗。
// 与 DDLReminderModal 互补：那个只管截止提醒节点，这个覆盖全部待办，
// 按紧急度分组（逾期 / 今天截止 / 今日循环 / 高优先级 / 其他）展示。
// 复用 DDLReminderModal 的样式类，仅新增分组小标题的样式。

// 分组的展示顺序、图标与本地化标题键。
const SECTIONS = [
  { key: "overdue", icon: "⚠️", label: "reminder.section.overdue" },
  { key: "dueToday", icon: "📅", label: "reminder.section.dueToday" },
  { key: "soon", icon: "⏳", label: "reminder.section.soon" },
  { key: "recurring", icon: "🔁", label: "reminder.section.recurring" },
  { key: "highPriority", icon: "🔴", label: "reminder.section.highPriority" },
  { key: "others", icon: "📋", label: "reminder.section.others" },
];

export default function TaskReminderModal() {
  const { todos, toggleTodo } = useTodos();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const groups = React.useMemo(() => collectTodayTasks(todos), [todos]);

  // 自动弹出：每次进站/刷新，只要有待办就弹（不做每日去重）。仅在挂载时判定一次。
  useEffect(() => {
    if (collectTodayTasks(todos).total > 0) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => setOpen(false);

  const goToFocus = () => {
    dismiss();
    navigate("/focus");
  };

  // Esc 关闭：同 DDLReminderModal——进站就自己弹出来的东西，得留一条键盘退路
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="ddl-modal-overlay" role="presentation" onClick={dismiss}>
      <div
        className="ddl-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("reminder.modal.title")}
      >
        <div className="ddl-modal-header">
          <span className="ddl-modal-icon">📝</span>
          <div>
            <div className="ddl-modal-title">{t("reminder.modal.title")}</div>
            <div className="ddl-modal-sub">
              {t("reminder.modal.sub", { count: groups.total })}
            </div>
          </div>
        </div>

        {groups.total > 0 ? (
          <ul className="ddl-modal-list">
            {SECTIONS.map(({ key, icon, label }) => {
              const items = groups[key];
              if (!items.length) return null;
              return (
                <React.Fragment key={key}>
                  <li className="reminder-section">
                    <span className="reminder-section-icon">{icon}</span>
                    <span className="reminder-section-label">{t(label)}</span>
                    <span className="reminder-section-count">{items.length}</span>
                  </li>
                  {items.map(({ todo, daysLeft }) => (
                    <li key={todo.id} className="ddl-modal-item">
                      <button
                        className="ddl-modal-check"
                        onClick={() => toggleTodo(todo.id)}
                        title={t("ddl.markDone")}
                      >
                        ○
                      </button>
                      <div className="ddl-modal-item-body">
                        <span className="ddl-modal-task">{todo.text}</span>
                      </div>
                      {daysLeft !== null && (
                        <span className={`ddl-modal-tag ${countdownClass(daysLeft)}`}>
                          {countdownLabel(daysLeft, t)}
                        </span>
                      )}
                    </li>
                  ))}
                </React.Fragment>
              );
            })}
          </ul>
        ) : (
          <div className="ddl-modal-empty">{t("reminder.modal.empty")}</div>
        )}

        <div className="ddl-modal-actions">
          <button className="ddl-modal-go" onClick={goToFocus}>
            {t("reminder.modal.goto")}
          </button>
          <button className="ddl-modal-dismiss" onClick={dismiss}>
            {t("reminder.modal.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
