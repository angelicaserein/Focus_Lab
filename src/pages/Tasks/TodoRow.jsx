import React, { useState, useRef } from "react";
import AttrCell from "@/pages/Tasks/cells/AttrCell";
import RecurringDayPicker, { recurringLabel } from "@/components/todo/RecurringDayPicker";
import useOutsideClick from "@/hooks/common/useOutsideClick";
import { useLanguage } from "@/context/LanguageContext";
import desktop from "@/utils/desktop/desktopBridge";

// 回调接收 (id, ...) 形式的稳定 context 函数（toggleTodo/editTodo/setTodoAttr/
// deleteTodo），由本组件绑定 todo.id 后调用。配合 React.memo，可在父级因
// 搜索/筛选/排序重渲染时跳过未变化的行。
function TodoRow({ todo, visibleAttrs, onSaveAttr, onEditText, onToggle, onDelete, onSetRecurring, selected, onSelect }) {
  const { t } = useLanguage();
  const [editingText, setEditingText] = useState(false);
  const [textDraft,   setTextDraft]   = useState("");
  const [showDayPicker, setShowDayPicker] = useState(false);
  const textCellRef = useRef(null);
  useOutsideClick(textCellRef, () => setShowDayPicker(false), showDayPicker);

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
  const recurringDays = todo.recurringDays ?? [];
  const recurLabel = recurringLabel(recurringDays, t);

  return (
    <tr
      className={`tasks-row${todo.completed ? " done" : ""}${selected ? " selected" : ""}`}
      data-highlight-id={todo.id}
    >
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
        <input
          type="checkbox"
          className="task-check"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          title={t("tasks.colDone")}
          aria-label={t("tasks.toggleDoneAria", { text: todo.text })}
        />
      </td>

      <td className="td-text editable" ref={textCellRef} onClick={() => !editingText && startEditText()}>
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
        {/* ↺ 固定任务开关：点开选星期几，选中的日子到点会自动重置为未完成 */}
        <button
          type="button"
          className={`row-recur${recurringDays.length > 0 ? " active" : ""}`}
          onClick={(e) => { e.stopPropagation(); setShowDayPicker(v => !v); }}
          title={recurringDays.length > 0
            ? t("todo.form.recurringSet", { label: recurLabel })
            : t("todo.item.setRecurring")}
          aria-pressed={recurringDays.length > 0}
        >
          ↺{recurringDays.length > 0 && <span className="row-recur-label">{recurLabel}</span>}
        </button>

        {/* 桌面版拖文件建的任务：点一下用系统默认程序打开那个文件 */}
        {todo.filePath && (
          <button
            type="button"
            className="todo-file-open"
            title={todo.filePath}
            onClick={async (e) => {
              e.stopPropagation();
              // 按钮引用要在 await 之前拿：同步返回之后 currentTarget 就是 null 了
              const btn = e.currentTarget;
              const err = await desktop.openPath(todo.filePath);
              if (err) btn.title = t("todo.item.openFileFailed");
            }}
          >
            📎 {t("todo.item.openFile")}
          </button>
        )}

        {showDayPicker && (
          <div className="row-recur-panel" onClick={e => e.stopPropagation()}>
            <RecurringDayPicker
              days={recurringDays}
              onChange={(d) => onSetRecurring(todo.id, d)}
              onClose={() => setShowDayPicker(false)}
            />
          </div>
        )}
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
