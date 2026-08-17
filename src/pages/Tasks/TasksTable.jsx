import { attrName } from "@/utils/task/taskAttrUtils";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTodos } from "@/context/TodoContext";
import { useTaskAttrs } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import useConfirm from "@/hooks/common/useConfirm";
import AttrHeaderEditor from "@/pages/Tasks/AttrHeaderEditor";
import TodoRow from "@/pages/Tasks/TodoRow";
import { onActivateKey } from "@/utils/a11y";

const TYPE_COL_WIDTHS = {
  select:      "80px",
  multiselect: "90px",
  date:        "90px",
  number:      "82px",
  text:        "160px",
};

/**
 * 表格视图（「高级模式」）：Notion 式的一行一任务、一列一属性，
 * 用来批量看 / 批量改。数据由任务库页面统一算好后传进来。
 */
export default function TasksTable({ todos, visibleAttrs, activeDatabaseId, isDbEmpty, sort }) {
  const { addTodo, toggleTodo, editTodo, setTodoAttr, deleteTodo, deleteTodos, setTodosDone } = useTodos();
  const { taskAttrs } = useTaskAttrs();
  const { t } = useLanguage();
  const [confirm, confirmDialog] = useConfirm();

  const [showNewRow,  setShowNewRow]  = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const newInputRef = useRef(null);

  // ── 勾选与批量操作 ──
  // 只认「当前看得见的这些任务」：换库、改筛选后不该还攥着看不见的选中项。
  const [selected, setSelected] = useState(() => new Set());
  const selectAllRef = useRef(null);

  useEffect(() => {
    setSelected(prev => {
      if (!prev.size) return prev;
      const visible = new Set(todos.map(td => td.id));
      const next = new Set([...prev].filter(id => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [todos]);

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const allSelected  = todos.length > 0 && selected.size === todos.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(todos.map(td => td.id)));

  // 半选态只能用 DOM 属性表达
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const setSelectedDone = (done) => {
    setTodosDone([...selected], done);
    setSelected(new Set());
  };

  const deleteSelected = async () => {
    const ok = await confirm({
      title: t("tasks.batch.confirmDelete", { count: selected.size }),
      message: t("tasks.batch.confirmDeleteDetail"),
      danger: true,
      confirmLabel: t("tasks.delete"),
    });
    if (!ok) return;
    deleteTodos([...selected]);
    setSelected(new Set());
  };

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

  return (
    <div className="tasks-table-wrap">
      {selected.size > 0 && (
        <div className="tasks-batch-bar" role="toolbar" aria-label={t("tasks.batch.aria")}>
          <span className="tbb-count">{t("tasks.batch.selected", { count: selected.size })}</span>
          <button type="button" className="tbb-btn" onClick={() => setSelectedDone(true)}>
            {t("tasks.batch.complete")}
          </button>
          <button type="button" className="tbb-btn" onClick={() => setSelectedDone(false)}>
            {t("tasks.batch.uncomplete")}
          </button>
          <button type="button" className="tbb-btn danger" onClick={deleteSelected}>
            {t("tasks.batch.delete")}
          </button>
          <button type="button" className="tbb-clear" onClick={() => setSelected(new Set())}>
            {t("tasks.batch.clear")}
          </button>
        </div>
      )}

      <div className="tasks-table-scroll">
        <table className="tasks-table">
          <thead>
            <tr>
              <th className="th-select">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="task-check row-select"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={todos.length === 0}
                  title={t("tasks.selectAll")}
                  aria-label={t("tasks.selectAll")}
                />
              </th>
              <th className="th-check">{t("tasks.colDone")}</th>
              <th className="th-text sortable" onClick={() => sort.handleSortClick("name")}>
                {t("tasks.colName")}{sort.arrow("name")}
              </th>
              {visibleAttrs.map(attr => (
                // 点击属性表头只打开属性编辑器；排序/筛选统一走工具栏。
                <th
                  key={attr.id}
                  className="th-attr"
                  style={{ width: TYPE_COL_WIDTHS[attr.type] }}
                >
                  <div
                    className="th-inner th-attr-edit"
                    role="button"
                    tabIndex={0}
                    title={t("tasks.editAttr")}
                    onClick={e => openAttrEditor(attr.id, e.currentTarget.closest("th"))}
                    onKeyDown={onActivateKey(e => openAttrEditor(attr.id, e.currentTarget.closest("th")))}
                  >
                    <span className="th-name">{attrName(t, attr)}</span>
                  </div>
                </th>
              ))}
              <th className="th-add-col">
                <button
                  className="th-add-btn"
                  title={t("tasks.addAttr")}
                  onClick={e => openAttrEditor("new", e.currentTarget.closest("th"))}
                >+</button>
              </th>
              <th className="th-del"></th>
            </tr>
          </thead>
          <tbody>
            {todos.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                visibleAttrs={visibleAttrs}
                onSaveAttr={setTodoAttr}
                onEditText={editTodo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                selected={selected.has(todo.id)}
                onSelect={toggleSelect}
              />
            ))}
            {showNewRow && (
              <tr className="tasks-new-row">
                <td></td>
                <td></td>
                <td colSpan={visibleAttrs.length + 2}>
                  <input
                    ref={newInputRef}
                    className="new-task-input"
                    placeholder={t("tasks.newRowPlaceholder")}
                    aria-label={t("tasks.newRowPlaceholder")}
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    onKeyDown={handleNewKeyDown}
                    onBlur={commitNewTask}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="del-btn"
                    onClick={() => { setNewTaskText(""); setShowNewRow(false); }}
                    aria-label={t("brainDump.cancel")}
                  >
                    ×
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {todos.length === 0 && !showNewRow && (
        <div className="tasks-empty">
          {isDbEmpty ? t("tasks.emptyNoTasks") : t("tasks.emptyNoMatch")}
        </div>
      )}

      {!showNewRow && (
        <button type="button" className="tasks-add-bottom" onClick={() => setShowNewRow(true)}>
          {t("tasks.newTask")}
        </button>
      )}

      {editingAttrId && (
        <AttrHeaderEditor
          attrDef={editingAttrId === "new" ? null : taskAttrs.find(a => a.id === editingAttrId) ?? null}
          anchorEl={attrAnchorEl}
          onClose={closeAttrEditor}
        />
      )}

      {confirmDialog}
    </div>
  );
}
