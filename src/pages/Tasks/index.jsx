import React, { useState, useRef, useEffect } from "react";
import { useTodos } from "@/context/TodoContext";
import { useTaskAttrs } from "@/context/DatabaseContext";
import AttrHeaderEditor from "@/pages/Tasks/AttrHeaderEditor";
import DatabaseTabs from "@/pages/Tasks/DatabaseTabs";
import TasksToolbar from "@/pages/Tasks/TasksToolbar";
import TodoRow from "@/pages/Tasks/TodoRow";
import TodoApp from "@/components/todo/TodoApp";
import DueDateAssistant from "@/pages/Tasks/DueDateAssistant";
import BrainDumpAssistant from "@/pages/Tasks/BrainDumpAssistant";
import useVisibleTasks from "@/pages/Tasks/useVisibleTasks";
import useToast from "@/hooks/common/useToast";
import "./Tasks.css";

const TYPE_COL_WIDTHS = {
  select:      "80px",
  multiselect: "90px",
  date:        "90px",
  number:      "82px",
  text:        "160px",
};

export default function Tasks() {
  const { addTodo, toggleTodo, editTodo, setTodoAttr, deleteTodo } = useTodos();
  const { taskAttrs } = useTaskAttrs();
  const { toast: savedMsg, showToast } = useToast(3200);

  const {
    filtered, visibleAttrs, fields, query, undatedTodos, scenario, isDbEmpty, activeDatabaseId,
  } = useVisibleTasks();

  const [showNewRow,   setShowNewRow]   = useState(false);
  const [newTaskText,  setNewTaskText]  = useState("");
  const [showDueAssist, setShowDueAssist] = useState(false);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const newInputRef = useRef(null);

  // null = closed, "new" = adding new attr, attrId string = editing existing
  const [editingAttrId, setEditingAttrId] = useState(null);
  const [attrAnchorEl,  setAttrAnchorEl]  = useState(null);

  const openAttrEditor = (id, anchor) => { setEditingAttrId(id); setAttrAnchorEl(anchor); };
  const closeAttrEditor = () => { setEditingAttrId(null); setAttrAnchorEl(null); };

  useEffect(() => {
    if (showNewRow) newInputRef.current?.focus();
  }, [showNewRow]);

  function commitNewTask() {
    if (newTaskText.trim()) addTodo(newTaskText.trim(), { databaseId: activeDatabaseId });
    setNewTaskText("");
    setShowNewRow(false);
  }

  function handleNewKeyDown(e) {
    if (e.key === "Enter") commitNewTask();
    if (e.key === "Escape") { setNewTaskText(""); setShowNewRow(false); }
  }

  const { handleSortClick, arrow } = query;

  return (
    <div className="tasks-page">
      {/* 专注 TO DO LIST：与专注页面同一个组件，置于任务库最上方 */}
      <TodoApp />

      <div className="tasks-header">
        <div className="tasks-title-row">
          <h1 className="tasks-title">任务库</h1>
          <span className="tasks-count">{filtered.length} 个任务</span>
        </div>
        <div className="tasks-header-actions">
          <button className="tasks-assist-btn" onClick={() => setShowBrainDump(true)}>
            🧠 倒脑子
          </button>
          {undatedTodos.length > 0 && (
            <button className="tasks-assist-btn" onClick={() => setShowDueAssist(true)}>
              🗓 排截止日 · {undatedTodos.length}
            </button>
          )}
          <button className="tasks-add-btn" onClick={() => setShowNewRow(true)}>+ 新建任务</button>
        </div>
      </div>

      <DatabaseTabs />

      <TasksToolbar query={query} fields={fields} scenario={scenario} />

      <div className="tasks-table-wrap">
        <div className="tasks-table-scroll">
        <table className="tasks-table">
          <thead>
            <tr>
              <th className="th-check"></th>
              <th className="th-text sortable" onClick={() => handleSortClick("name")}>
                任务{arrow("name")}
              </th>
              {visibleAttrs.map(attr => {
                // 点击属性表头只打开属性编辑器；排序/筛选统一走工具栏。
                return (
                  <th
                    key={attr.id}
                    className="th-attr"
                    style={{ width: TYPE_COL_WIDTHS[attr.type] }}
                  >
                    <div
                      className="th-inner th-attr-edit"
                      title="编辑属性"
                      onClick={e => openAttrEditor(attr.id, e.currentTarget.closest("th"))}
                    >
                      <span className="th-name">{attr.name}</span>
                    </div>
                  </th>
                );
              })}
              <th className="th-add-col">
                <button
                  className="th-add-btn"
                  title="添加属性"
                  onClick={e => openAttrEditor("new", e.currentTarget.closest("th"))}
                >+</button>
              </th>
              <th className="th-del"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                visibleAttrs={visibleAttrs}
                onSaveAttr={setTodoAttr}
                onEditText={editTodo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
              />
            ))}
            {showNewRow && (
              <tr className="tasks-new-row">
                <td></td>
                <td colSpan={visibleAttrs.length + 2}>
                  <input
                    ref={newInputRef}
                    className="new-task-input"
                    placeholder="输入任务名称，Enter 确认，Esc 取消…"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    onKeyDown={handleNewKeyDown}
                    onBlur={commitNewTask}
                  />
                </td>
                <td>
                  <button className="del-btn" onClick={() => { setNewTaskText(""); setShowNewRow(false); }}>×</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {filtered.length === 0 && !showNewRow && (
          <div className="tasks-empty">
            {isDbEmpty
              ? "还没有任务，点击下方「+ 新建任务」开始吧"
              : "没有符合条件的任务"}
          </div>
        )}

        {!showNewRow && (
          <button className="tasks-add-bottom" onClick={() => setShowNewRow(true)}>
            + 新建任务
          </button>
        )}
      </div>

      {showBrainDump && (
        <BrainDumpAssistant
          onClose={() => setShowBrainDump(false)}
          onAdded={(n) => showToast(`已加入 ${n} 条任务`)}
        />
      )}

      {savedMsg && <div className="tasks-saved" role="status">{savedMsg}</div>}

      {showDueAssist && (
        <DueDateAssistant
          candidates={undatedTodos}
          onAssign={(id, date) => setTodoAttr(id, "dueDate", date)}
          onClose={() => setShowDueAssist(false)}
        />
      )}

      {editingAttrId && (
        <AttrHeaderEditor
          attrDef={editingAttrId === "new" ? null : taskAttrs.find(a => a.id === editingAttrId) ?? null}
          anchorEl={attrAnchorEl}
          onClose={closeAttrEditor}
        />
      )}
    </div>
  );
}
