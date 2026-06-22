import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTodos } from "../../context/TodoContext";
import { useTaskAttrs, useDatabases } from "../../context/DatabaseContext";
import { buildSortWeightMap } from "../../utils/taskAttrUtils";
import AttrHeaderEditor from "./AttrHeaderEditor";
import DatabaseTabs from "./DatabaseTabs";
import TodoRow from "./TodoRow";
import useTaskFilter from "./useTaskFilter";
import "./Tasks.css";

const TYPE_COL_WIDTHS = {
  select:      "80px",
  multiselect: "90px",
  date:        "90px",
  number:      "82px",
  text:        "160px",
};

const STATUS_OPTS = [
  { id: "all",       label: "全部" },
  { id: "active",    label: "待办" },
  { id: "completed", label: "已完成" },
];

const SORT_OPTS = [
  { id: "createdAt", label: "创建时间" },
  { id: "dueDate",   label: "截止日期" },
  { id: "priority",  label: "优先级" },
  { id: "text",      label: "任务名" },
];

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

  const [statusFilter,   setStatusFilter]   = useState("all");
  const [priorityFilter, setPriorityFilter] = useState([]);
  const [tagFilter,      setTagFilter]      = useState([]);
  const [search,         setSearch]         = useState("");
  const [sortBy,         setSortBy]         = useState("createdAt");
  const [sortDir,        setSortDir]        = useState("desc");

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

  const filtered = useTaskFilter({ todos: dbTodos, statusFilter, priorityFilter, tagFilter, search, sortBy, sortDir, prioritySortMap });

  function commitNewTask() {
    if (newTaskText.trim()) addTodo(newTaskText.trim(), { databaseId: activeDatabaseId });
    setNewTaskText("");
    setShowNewRow(false);
  }

  function handleNewKeyDown(e) {
    if (e.key === "Enter") commitNewTask();
    if (e.key === "Escape") { setNewTaskText(""); setShowNewRow(false); }
  }

  function togglePFilter(pid) {
    setPriorityFilter(p => p.includes(pid) ? p.filter(x => x !== pid) : [...p, pid]);
  }
  function toggleTFilter(tid) {
    setTagFilter(t => t.includes(tid) ? t.filter(x => x !== tid) : [...t, tid]);
  }

  function handleSortClick(field) {
    if (sortBy === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortDir("desc"); }
  }

  const arrow = f => sortBy === f ? (sortDir === "desc" ? " ↓" : " ↑") : "";
  const hasFilter = priorityFilter.length || tagFilter.length || statusFilter !== "all" || search;

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

      <div className="tasks-toolbar">
        <div className="tasks-search-wrap">
          <input
            className="tasks-search"
            placeholder="搜索任务或备注…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
        </div>

        <div className="toolbar-row">
          <div className="filter-group status-group">
            {STATUS_OPTS.map(s => (
              <button
                key={s.id}
                className={`flt-btn${statusFilter === s.id ? " active" : ""}`}
                onClick={() => setStatusFilter(s.id)}
              >{s.label}</button>
            ))}
          </div>

          {priorityOpts.length > 0 && (
            <div className="filter-group">
              {priorityOpts.map(p => (
                <button
                  key={p.id}
                  className={`flt-btn priority-pill${priorityFilter.includes(p.id) ? " active" : ""}`}
                  style={{ "--pill": p.color }}
                  onClick={() => togglePFilter(p.id)}
                >{p.label}</button>
              ))}
            </div>
          )}

          {tagsOpts.length > 0 && (
            <div className="filter-group">
              {tagsOpts.map(t => (
                <button
                  key={t.id}
                  className={`flt-btn tag-pill${tagFilter.includes(t.id) ? " active" : ""}`}
                  title={t.label}
                  onClick={() => toggleTFilter(t.id)}
                >{t.icon ?? t.label}</button>
              ))}
            </div>
          )}

          {hasFilter && (
            <button className="flt-clear" onClick={() => {
              setPriorityFilter([]); setTagFilter([]); setStatusFilter("all"); setSearch("");
            }}>清除筛选</button>
          )}

          <div className="sort-group">
            <span className="sort-label">排序</span>
            {SORT_OPTS.map(s => (
              <button
                key={s.id}
                className={`sort-btn${sortBy === s.id ? " active" : ""}`}
                onClick={() => handleSortClick(s.id)}
              >{s.label}{arrow(s.id)}</button>
            ))}
          </div>
        </div>
      </div>

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
                onSaveAttr={(attrId, value) => setTodoAttr(todo.id, attrId, value)}
                onEditText={(text) => { if (text.trim()) editTodo(todo.id, text.trim()); }}
                onToggle={() => toggleTodo(todo.id)}
                onDelete={() => deleteTodo(todo.id)}
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

