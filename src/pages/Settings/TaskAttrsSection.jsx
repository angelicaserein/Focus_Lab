import React, { useState } from "react";
import { useTaskAttrs } from "../../context/TaskAttrContext";
import AttrEditor from "./AttrEditor";

const TYPE_LABELS = {
  select:      "单选",
  multiselect: "多选",
  text:        "文本",
  date:        "日期",
  number:      "数字",
};

export default function TaskAttrsSection() {
  const { taskAttrs, updateTaskAttr, deleteTaskAttr } = useTaskAttrs();
  const [editingId, setEditingId]   = useState(null);
  const [addingNew, setAddingNew]   = useState(false);

  const sorted = [...taskAttrs].sort((a, b) => a.order - b.order);

  function handleDelete(attr) {
    if (attr.system) return;
    if (window.confirm(`删除属性「${attr.name}」？已有数据不会被清除。`)) {
      deleteTaskAttr(attr.id);
    }
  }

  return (
    <div className="task-attrs-section">
      <div className="task-attrs-list">
        {sorted.map(attr => (
          <div key={attr.id}>
            {editingId === attr.id ? (
              <AttrEditor
                attr={attr}
                mode="edit"
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="task-attr-row">
                <span className="task-attr-name">{attr.name}</span>
                <span className="task-attr-type-badge">{TYPE_LABELS[attr.type] ?? attr.type}</span>

                <button
                  className={`task-attr-vis-btn${attr.visible ? " active" : ""}`}
                  onClick={() => updateTaskAttr(attr.id, { visible: !attr.visible })}
                  title={attr.visible ? "点击隐藏此列" : "点击显示此列"}
                >
                  {attr.visible ? "显示" : "隐藏"}
                </button>

                <button
                  className="task-attr-action-btn"
                  onClick={() => setEditingId(attr.id)}
                  title="编辑"
                >✎</button>

                <button
                  className={`task-attr-action-btn danger${attr.system ? " disabled" : ""}`}
                  onClick={() => handleDelete(attr)}
                  disabled={attr.system}
                  title={attr.system ? "内置属性不可删除" : "删除"}
                >×</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {addingNew ? (
        <AttrEditor mode="create" onDone={() => setAddingNew(false)} />
      ) : (
        <button className="task-attrs-add-btn" onClick={() => setAddingNew(true)}>
          + 添加属性
        </button>
      )}
    </div>
  );
}
