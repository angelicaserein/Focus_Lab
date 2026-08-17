import React, { useMemo, useState } from "react";
import { Waves, Table2 } from "lucide-react";
import { useTodos } from "@/context/TodoContext";
import { useTaskAttrs } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import DatabaseTabs from "@/pages/Tasks/DatabaseTabs";
import TasksToolbar from "@/pages/Tasks/TasksToolbar";
import TasksTable from "@/pages/Tasks/TasksTable";
import FlowView from "@/pages/Tasks/FlowView";
import DueDateAssistant from "@/pages/Tasks/DueDateAssistant";
import BrainDumpAssistant from "@/pages/Tasks/BrainDumpAssistant";
import useVisibleTasks from "@/pages/Tasks/useVisibleTasks";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import useToast from "@/hooks/common/useToast";
import "./Tasks.css";

/**
 * 任务库：一份数据、两种排布。
 * 默认「心流」——一次托举一件、宽松卡片；需要批量看改时切到「表格」高级模式。
 * 库标签 / 情景筛选 / 搜索筛选排序 / 倒脑子 / 排截止日全部在外层共用，
 * 两个视图看到的任务集合永远一致。
 */
export default function Tasks() {
  const { setTodoAttr, deleteTodos } = useTodos();
  const { taskAttrs } = useTaskAttrs();
  const { t } = useLanguage();
  // 倒脑子落库后的提示：AI 拆出来的东西未必都想要，给一段时间反悔。
  // payload: { ids } 刚加入的一批 ｜ { undone: true } 已撤回
  const { toast: added, showToast } = useToast(6000);

  const undoBrainDump = () => {
    deleteTodos(added?.ids, { undoAdd: true });
    showToast({ undone: true });
  };

  const {
    filtered, visibleAttrs, fields, query, undatedTodos, scenario, isDbEmpty, activeDatabaseId,
  } = useVisibleTasks();

  const [view, setView] = useLocalStorage("tasks.view", "flow"); // "flow" | "table"
  const [showDueAssist, setShowDueAssist] = useState(false);
  const [showBrainDump, setShowBrainDump] = useState(false);

  const priorityAttr = useMemo(
    () => taskAttrs.find(a => a.id === "priority" && a.type === "select") ?? null,
    [taskAttrs],
  );

  // 心流视图靠它决定何时重排卡片：换库、换情景、改筛选/排序/搜索才重排。
  const scopeKey = useMemo(
    () => `${activeDatabaseId}|${scenario?.on ? scenario.name : ""}|${JSON.stringify(query.query)}`,
    [activeDatabaseId, scenario?.on, scenario?.name, query.query],
  );

  return (
    <div className={`tasks-page${view === "flow" ? " flow" : ""}`}>
      <div className="tasks-header">
        <div className="tasks-title-row">
          <h1 className="tasks-title">{t("tasks.title")}</h1>
          <span className="tasks-count">{t("tasks.count", { count: filtered.length })}</span>
        </div>
        <div className="tasks-header-actions">
          <div className="tasks-view-switch" role="group" aria-label={t("tasks.viewSwitchAria")}>
            <button
              type="button"
              className={`tasks-view-btn${view === "flow" ? " active" : ""}`}
              onClick={() => setView("flow")}
              title={t("tasks.view.flowTitle")}
              aria-pressed={view === "flow"}
            >
              <Waves size={15} aria-hidden="true" /> {t("tasks.view.flow")}
            </button>
            <button
              type="button"
              className={`tasks-view-btn${view === "table" ? " active" : ""}`}
              onClick={() => setView("table")}
              title={t("tasks.view.tableTitle")}
              aria-pressed={view === "table"}
            >
              <Table2 size={15} aria-hidden="true" /> {t("tasks.view.table")}
            </button>
          </div>
          <button type="button" className="tasks-assist-btn" onClick={() => setShowBrainDump(true)}>
            🧠 {t("focus.matrix.brainDump")}
          </button>
          {undatedTodos.length > 0 && (
            <button type="button" className="tasks-assist-btn" onClick={() => setShowDueAssist(true)}>
              {t("tasks.dueAssist", { count: undatedTodos.length })}
            </button>
          )}
        </div>
      </div>

      <DatabaseTabs />

      <TasksToolbar query={query} fields={fields} scenario={scenario} />

      {view === "flow" ? (
        <FlowView
          todos={filtered}
          visibleAttrs={visibleAttrs}
          priorityAttr={priorityAttr}
          activeDatabaseId={activeDatabaseId}
          scopeKey={scopeKey}
        />
      ) : (
        <TasksTable
          todos={filtered}
          visibleAttrs={visibleAttrs}
          activeDatabaseId={activeDatabaseId}
          isDbEmpty={isDbEmpty}
          sort={query}
        />
      )}

      {showBrainDump && (
        <BrainDumpAssistant
          onClose={() => setShowBrainDump(false)}
          onAdded={(ids) => showToast({ ids })}
        />
      )}

      {added && (
        <div className="tasks-saved" role="status">
          <span>
            {added.undone
              ? t("brainDump.undone")
              : t("tasks.addedToast", { count: added.ids.length })}
          </span>
          {!added.undone && (
            <button type="button" className="tasks-saved-undo" onClick={undoBrainDump}>
              {t("brainDump.undo")}
            </button>
          )}
        </div>
      )}

      {showDueAssist && (
        <DueDateAssistant
          candidates={undatedTodos}
          onAssign={(id, date) => setTodoAttr(id, "dueDate", date)}
          onClose={() => setShowDueAssist(false)}
        />
      )}
    </div>
  );
}
