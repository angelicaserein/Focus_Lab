import React, { useMemo, useState } from "react";
import { useTodos } from "@/context/TodoContext";
import { useTaskAttrs } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import TasksToolbar from "@/pages/Tasks/TasksToolbar";
import FlowView from "@/pages/Tasks/FlowView";
import DueDateAssistant from "@/pages/Tasks/DueDateAssistant";
import BrainDumpAssistant from "@/pages/Tasks/BrainDumpAssistant";
import useVisibleTasks from "@/pages/Tasks/useVisibleTasks";
import useToast from "@/hooks/common/useToast";
import useHighlightTarget from "@/hooks/common/useHighlightTarget";
import Toast from "@/components/ui/Toast";
import "./Tasks.css";

/**
 * 任务库：一次托举一件、宽松卡片的单一排布。
 * 情景筛选 / 搜索筛选排序 / 倒脑子 / 排截止日在页头共用。
 */
export default function Tasks() {
  const { setTodoAttr, deleteTodos, pendingUndo, undoLast } = useTodos();
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
    filtered, visibleAttrs, fields, query, undatedTodos, scenario, activeDatabaseId, quickFilter,
  } = useVisibleTasks();

  // 跨页搜索点进来时定位到那一条。（若被工具栏的筛选/情景过滤挡住，
  // 就只跳到本页不高亮，这一步不去替用户清筛选。）
  const highlightId = useHighlightTarget();

  const [showDueAssist, setShowDueAssist] = useState(false);
  const [showBrainDump, setShowBrainDump] = useState(false);

  const priorityAttr = useMemo(
    () => taskAttrs.find(a => a.id === "priority" && a.type === "select") ?? null,
    [taskAttrs],
  );

  // 卡片何时重排：换情景、改筛选/排序/搜索才重排。
  const scopeKey = useMemo(
    () => `${activeDatabaseId}|${scenario?.on ? scenario.name : ""}|${quickFilter.value ?? ""}|${JSON.stringify(query.query)}`,
    [activeDatabaseId, scenario?.on, scenario?.name, quickFilter.value, query.query],
  );

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div className="tasks-title-row">
          <h1 className="tasks-title">{t("tasks.title")}</h1>
          <span className="tasks-count">{t("tasks.count", { count: filtered.length })}</span>
        </div>
        <div className="tasks-header-actions">
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

      {/* 搜索/筛选/排序靠右贴边，不单占一张卡片横在任务上方。 */}
      <div className="tasks-bar">
        <TasksToolbar query={query} fields={fields} scenario={scenario} quickFilter={quickFilter} />
      </div>

      <div className="tasks-view-body">
        <FlowView
          todos={filtered}
          visibleAttrs={visibleAttrs}
          priorityAttr={priorityAttr}
          activeDatabaseId={activeDatabaseId}
          scopeKey={scopeKey}
          highlightId={highlightId}
        />
      </div>

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

      {/* 删错、勾错一条都能立刻撤回；没有这个 toast 的话那份撤销能力就没有入口。 */}
      <Toast pending={pendingUndo} undo={undoLast} getText={(item) => item.text} />

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
