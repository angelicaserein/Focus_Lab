import React, { useState } from "react";
import AttrCell from "./cells/AttrCell";

export default function TodoRow({ todo, visibleAttrs, onSaveAttr, onEditText, onToggle, onDelete }) {
  const [editingText, setEditingText] = useState(false);
  const [textDraft,   setTextDraft]   = useState("");

  const startEditText = () => { setTextDraft(todo.text); setEditingText(true); };
  const commitText = () => {
    onEditText(textDraft);
    setEditingText(false);
  };
  const handleTextKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitText(); }
    if (e.key === "Escape") setEditingText(false);
  };

  return (
    <tr className={`tasks-row${todo.completed ? " done" : ""}`}>
      <td className="td-check">
        <input type="checkbox" className="task-check" checked={todo.completed} onChange={onToggle} />
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
        {todo.recurringDays?.length > 0 && <span className="row-recur" title="重复任务">↺</span>}
      </td>

      {visibleAttrs.map(attr => (
        <td key={attr.id} className="td-attr editable">
          <AttrCell attrDef={attr} todo={todo} onSave={onSaveAttr} />
        </td>
      ))}

      <td className="td-del">
        <button className="del-btn" onClick={onDelete} title="删除">×</button>
      </td>
    </tr>
  );
}
