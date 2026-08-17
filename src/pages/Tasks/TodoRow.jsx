import React, { useState } from "react";
import AttrCell from "@/pages/Tasks/cells/AttrCell";
import { useLanguage } from "@/context/LanguageContext";

// 回调接收 (id, ...) 形式的稳定 context 函数（toggleTodo/editTodo/setTodoAttr/
// deleteTodo），由本组件绑定 todo.id 后调用。配合 React.memo，可在父级因
// 搜索/筛选/排序重渲染时跳过未变化的行。
function TodoRow({ todo, visibleAttrs, onSaveAttr, onEditText, onToggle, onDelete, selected, onSelect }) {
  const { t } = useLanguage();
  const [editingText, setEditingText] = useState(false);
  const [textDraft,   setTextDraft]   = useState("");

  const startEditText = () => { setTextDraft(todo.text); setEditingText(true); };
  const commitText = () => {
    onEditText(todo.id, textDraft);
    setEditingText(false);
  };
  const handleTextKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitText(); }
    if (e.key === "Escape") setEditingText(false);
  };

  const saveAttr = (attrId, value) => onSaveAttr(todo.id, attrId, value);

  return (
    <tr className={`tasks-row${todo.completed ? " done" : ""}${selected ? " selected" : ""}`}>
      <td className="td-select">
        <input
          type="checkbox"
          className="task-check row-select"
          checked={selected}
          onChange={() => onSelect(todo.id)}
          aria-label={t("tasks.selectRowAria", { text: todo.text })}
        />
      </td>

      <td className="td-check">
        <input type="checkbox" className="task-check" checked={todo.completed} onChange={() => onToggle(todo.id)} />
      </td>

      <td className="td-text editable" onClick={() => !editingText && startEditText()}>
        {editingText ? (
          <input
            className="cell-input"
            autoFocus
            value={textDraft}
            onChange={e => setTextDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={handleTextKey}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="task-text">{todo.text}</span>
        )}
        {todo.recurringDays?.length > 0 && <span className="row-recur" title={t("tasks.recurring")}>↺</span>}
      </td>

      {visibleAttrs.map(attr => (
        <td key={attr.id} className="td-attr editable">
          <AttrCell attrDef={attr} todo={todo} onSave={saveAttr} />
        </td>
      ))}

      <td className="td-del">
        <button
          type="button"
          className="del-btn"
          onClick={() => onDelete(todo.id)}
          title={t("tasks.delete")}
          aria-label={t("todo.deleteAria", { text: todo.text })}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

export default React.memo(TodoRow);
