import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTodos } from "../../context/TodoContext";
import { useTaskAttrs, useDatabases } from "../../context/DatabaseContext";
import { buildSortWeightMap } from "../../utils/taskAttrUtils";
import AttrHeaderEditor from "./AttrHeaderEditor";
import DatabaseTabs from "./DatabaseTabs";
import TasksToolbar from "./TasksToolbar";
import TodoRow from "./TodoRow";
import useTaskFilter from "./useTaskFilter";
import useTaskFilters from "./useTaskFilters";
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

  const dbTodos = useMemo(
    () => todos.filter(t => (t.databaseId ?? "default") === activeDatabaseId),
    [todos, activeDatabaseId],
  );

  const visibleAttrs = useMemo(
    () => [...taskAttrs].filter(a => a.visible).sort((a, b) => a.order - b.order),
    [taskAttrs],
  );

  const priorityAttr = taskAttrs.find(a => a.id === "priority");
  const tagsAttr     = taskAttrs.find(a => a.id === "tags");
  const priorityOpts = priorityAttr?.options ?? [];
  const tagsOpts     = tagsAttr?.options ?? [];
  const prioritySortMap = useMemo(() => buildSortWeightMap(priorityAttr), [priorityAttr]);

  const filters = useTaskFilters();

  const [showNewRow,   setShowNewRow]   = useState(false);
  const [newTaskText,  setNewTaskText]  = useState("");
  const newInputRef = useRef(null);

  // null = closed, "new" = adding new attr, attrId string = editing existing
  const [editingAttrId, setEditingAttrId] = useState(null);
  const [attrAnchorEl,  setAttrAnchorEl]  = useState(null);

  const openAttrEditor = (id, anchor) => { setEditingAttrId(id); setAttrAnchorEl(anchor); };
  const closeAttrEditor = () => { setEditingAttrId(null); setAttrAnchorEl(null); };

  useEffect(() => {
    if (showNewRow) newInputRef.current?.focus();
  }, [showNewRow]);

  const filtered = useTaskFilter({
    todos: dbTodos,
    statusFilter:   filters.statusFilter,
    priorityFilter: filters.priorityFilter,
    tagFilter:      filters.tagFilter,
    search:         filters.search,
    sortBy:         filters.sortBy,
    sortDir:        filters.sortDir,
    prioritySortMap,
  });

  function commitNewTask() {
    if (newTaskText.trim()) addTodo(newTaskText.trim(), { databaseId: activeDatabaseId });
    setNewTaskText("");
    setShowNewRow(false);
  }

  function handleNewKeyDown(e) {
    if (e.key === "Enter") commitNewTask();
    if (e.key === "Escape") { setNewTaskText(""); setShowNewRow(false); }
  }

  const { handleSortClick, arrow } = filters;

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div className="tasks-title-row">
          <h1 className="tasks-title">任务库</h1>
          <span className="tasks-count">{filtered.length} 个任务</span>
        </div>
        <button className="tasks-add-btn" onClick={() => setShowNewRow(true)}>+ 新建任务</button>
      </div>

      <DatabaseTabs />

      <TasksToolbar filters={filters} priorityOpts={priorityOpts} tagsOpts={tagsOpts} />

      <div className="tasks-table-wrap">
        <div className="tasks-table-scroll">
        <table className="tasks-table">
          <thead>
            <tr>
              <th className="th-check"></th>
              <th className="th-text sortable" onClick={() => handleSortClick("text")}>
                任务{arrow("text")}
              </th>
              {visibleAttrs.map(attr => {
                const isSortable = attr.id === "priority" || attr.id === "dueDate";
                const sortKey = attr.id === "dueDate" ? "dueDate" : attr.id;
                return (
                  <th
                    key={attr.id}
                    className="th-attr"
                    style={{ width: TYPE_COL_WIDTHS[attr.type] }}
                  >
                    <div className={`th-inner${isSortable ? " sortable" : ""}`}
                         onClick={isSortable ? () => handleSortClick(sortKey) : undefined}>
                      <span className="th-name">{attr.name}{isSortable ? arrow(sortKey) : ""}</span>
                      <button
                        className="th-edit-btn"
                        title="编辑属性"
                        onClick={e => { e.stopPropagation(); openAttrEditor(attr.id, e.currentTarget.closest("th")); }}
                      >⚙</button>
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
