import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import { collectTodayTasks } from "@/utils/taskReminderUtils";
import { countdownLabel, countdownClass } from "@/utils/ddlUtils";
import "./TodayTasks.css";

// 「今天要做的事」：原先是进站就糊在屏幕上的弹窗，现在是首屏的一张卡。
// 同样的分组口径（collectTodayTasks），但不再拦路、不用先「知道了」才能用 app——
// 想看就看，不想看就往下滚，这对 ADHD 用户比一记强制打断友好得多。

// 分组的展示顺序、图标与本地化标题键。
const SECTIONS = [
  { key: "overdue", icon: "⚠️", label: "reminder.section.overdue" },
  { key: "dueToday", icon: "📅", label: "reminder.section.dueToday" },
  { key: "soon", icon: "⏳", label: "reminder.section.soon" },
  { key: "recurring", icon: "🔁", label: "reminder.section.recurring" },
  { key: "highPriority", icon: "🔴", label: "reminder.section.highPriority" },
  { key: "others", icon: "📋", label: "reminder.section.others" },
];

export default function TodayTasks() {
  const { todos, toggleTodo } = useTodos();
  const { addFocusTodo, clearFocusTodos } = useFocus();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const groups = useMemo(() => collectTodayTasks(todos), [todos]);

  // 一键开专注：把选中集合换成这一条，再带 autoStart 跳过去，
  // 专注页挂载即开会话、直接进沉浸层（见 useAutoStartFromRoute）。
  // 之所以先清空：从主页点某条任务的意思是「现在就做这件事」，
  // 而不是把它追加到上一轮残留的选中集合里。
  const focusOn = useCallback(
    (id) => {
      clearFocusTodos();
      addFocusTodo(id);
      navigate("/focus", { state: { autoStart: true } });
    },
    [clearFocusTodos, addFocusTodo, navigate],
  );

  return (
    <section className="today-wrap" aria-labelledby="today-title">
      <div className="today-header">
        <span className="today-title" id="today-title">
          {t("reminder.modal.title")}
        </span>
        {groups.total > 0 && (
          <span className="today-sub">
            {t("reminder.modal.sub", { count: groups.total })}
          </span>
        )}
      </div>

      {groups.total > 0 ? (
        <ul className="today-list">
          {SECTIONS.map(({ key, icon, label }) => {
            const items = groups[key];
            if (!items.length) return null;
            return (
              <React.Fragment key={key}>
                <li className="today-section">
                  <span className="today-section-icon" aria-hidden="true">{icon}</span>
                  <span className="today-section-label">{t(label)}</span>
                  <span className="today-section-count">{items.length}</span>
                </li>
                {items.map(({ todo, daysLeft }) => (
                  <li key={todo.id} className="today-item">
                    <button
                      className="today-check"
                      onClick={() => toggleTodo(todo.id)}
                      title={t("ddl.markDone")}
                      aria-label={t("ddl.markDone")}
                    >
                      ○
                    </button>
                    <span className="today-task">{todo.text}</span>
                    {daysLeft !== null && (
                      <span className={`today-tag ${countdownClass(daysLeft)}`}>
                        {countdownLabel(daysLeft, t)}
                      </span>
                    )}
                    <button
                      className="today-focus"
                      onClick={() => focusOn(todo.id)}
                      title={t("reminder.item.focus")}
                      aria-label={t("reminder.item.focus")}
                    >
                      ▶
                    </button>
                  </li>
                ))}
              </React.Fragment>
            );
          })}
        </ul>
      ) : (
        <p className="today-empty">{t("reminder.modal.empty")}</p>
      )}
    </section>
  );
}
