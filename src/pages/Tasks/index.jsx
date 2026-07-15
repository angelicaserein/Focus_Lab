import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTodos } from "@/context/TodoContext";
import { useTaskAttrs, useDatabases } from "@/context/DatabaseContext";
import { useScenarios } from "@/context/ScenarioContext";
import AttrHeaderEditor from "@/pages/Tasks/AttrHeaderEditor";
import DatabaseTabs from "@/pages/Tasks/DatabaseTabs";
import TasksToolbar from "@/pages/Tasks/TasksToolbar";
import TodoRow from "@/pages/Tasks/TodoRow";
import TodoApp from "@/components/todo/TodoApp";
import DueDateAssistant from "@/pages/Tasks/DueDateAssistant";
import useTaskQuery from "@/pages/Tasks/useTaskQuery";
import { applyQuery, buildQueryFields } from "@/pages/Tasks/taskQuery";
import "./Tasks.css";

const TYPE_COL_WIDTHS = {
  select:      "80px",
  multiselect: "90px",
  date:        "90px",
  number:      "82px",
  text:        "160px",
};

export default function Tasks() {
  const { todos, addTodo, toggleTodo, editTodo, setTodoAttr, deleteTodo } = useTodos();
  const { taskAttrs } = useTaskAttrs();
  const { activeDatabaseId } = useDatabases();
  const { activeScenario } = useScenarios();

  // 当前情景筛选：进入时默认开（贯穿全局），可一键关掉看全部；切换情景时恢复默认开。
  const scenarioTypes = activeScenario?.settings?.taskTypes ?? [];
  const hasScenarioFilter = scenarioTypes.length > 0;
  const [scenarioFilterOn, setScenarioFilterOn] = useState(true);
  useEffect(() => { setScenarioFilterOn(true); }, [activeScenario?.id]);
  const scenarioFilter = hasScenarioFilter && scenarioFilterOn ? scenarioTypes : null;

  const dbTodos = useMemo(
    () => todos.filter(t => (t.databaseId ?? "default") === activeDatabaseId),
    [todos, activeDatabaseId],
  );

  const visibleAttrs = useMemo(
    () => [...taskAttrs].filter(a => a.visible).sort((a, b) => a.order - b.order),
    [taskAttrs],
  );

  // 查询字段（内置字段 + 当前库全部列，含隐藏列，便于按任意属性筛选/排序）。
  const fields = useMemo(() => buildQueryFields(taskAttrs), [taskAttrs]);
  const query = useTaskQuery(fields);

  const [showNewRow,   setShowNewRow]   = useState(false);
  const [newTaskText,  setNewTaskText]  = useState("");
  const [showDueAssist, setShowDueAssist] = useState(false);
  const newInputRef = useRef(null);

  // 「排截止日」助手的候选：当前库里未完成、还没设截止日的任务
  const undatedTodos = useMemo(
    () => dbTodos.filter(t => !t.completed && !t.attrs?.dueDate),
    [dbTodos],
  );

  // null = closed, "new" = adding new attr, attrId string = editing existing
  const [editingAttrId, setEditingAttrId] = useState(null);
  const [attrAnchorEl,  setAttrAnchorEl]  = useState(null);

  const openAttrEditor = (id, anchor) => { setEditingAttrId(id); setAttrAnchorEl(anchor); };
  const closeAttrEditor = () => { setEditingAttrId(null); setAttrAnchorEl(null); };

  useEffect(() => {
    if (showNewRow) newInputRef.current?.focus();
  }, [showNewRow]);

  // 情景筛选独立于用户查询之外：先按当前情景筛掉明确标了别的类型的任务
  // （保留无标签任务，避免「任务消失」），再套用户的筛选/排序/搜索。
  const scenarioScoped = useMemo(() => {
    if (!scenarioFilter?.length) return dbTodos;
    return dbTodos.filter(t =>
      !(t.attrs?.tags?.length) || t.attrs.tags.some(tag => scenarioFilter.includes(tag)),
    );
  }, [dbTodos, scenarioFilter]);

  const filtered = useMemo(
    () => applyQuery(scenarioScoped, query.query, fields),
    [scenarioScoped, query.query, fields],
  );

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
          {undatedTodos.length > 0 && (
            <button className="tasks-assist-btn" onClick={() => setShowDueAssist(true)}>
              🗓 排截止日 · {undatedTodos.length}
            </button>
          )}
          <button className="tasks-add-btn" onClick={() => setShowNewRow(true)}>+ 新建任务</button>
        </div>
      </div>

      <DatabaseTabs />

      <TasksToolbar
        query={query}
        fields={fields}
        scenario={
          hasScenarioFilter
            ? { name: activeScenario.title, on: scenarioFilterOn, toggle: () => setScenarioFilterOn(v => !v) }
            : null
        }
      />

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
            {dbTodos.length === 0
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
