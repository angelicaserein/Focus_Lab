import { attrName } from "@/utils/task/taskAttrUtils";
import React, { useState, useRef, useEffect } from "react";
import { useTodos } from "@/context/TodoContext";
import { useTaskAttrs } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import AttrHeaderEditor from "@/pages/Tasks/AttrHeaderEditor";
import TodoRow from "@/pages/Tasks/TodoRow";

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
  const { addTodo, toggleTodo, editTodo, setTodoAttr, deleteTodo } = useTodos();
  const { taskAttrs } = useTaskAttrs();
  const { t } = useLanguage();

  const [showNewRow,  setShowNewRow]  = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
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

  return (
    <div className="tasks-table-wrap">
      <div className="tasks-table-scroll">
        <table className="tasks-table">
          <thead>
            <tr>
              <th className="th-check"></th>
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
                    title={t("tasks.editAttr")}
                    onClick={e => openAttrEditor(attr.id, e.currentTarget.closest("th"))}
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
              />
            ))}
            {showNewRow && (
              <tr className="tasks-new-row">
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
    </div>
  );
}
