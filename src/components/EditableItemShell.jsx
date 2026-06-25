import React from "react";

// 可编辑列表项的表现型外壳：负责外层容器的状态 class、整行点击切换、
// 以及右侧统一的「编辑 ✎ / 删除 ×」按钮。主体内容由 children 提供。
//   baseClass —— "todo-item" / "scenario-item"，与现有 CSS 保持一致
//   onRowToggle —— 整行点击（已忽略来自按钮 / 勾选框的点击）时触发
export default function EditableItemShell({
  baseClass,
  isNew,
  removing,
  editing,
  selected,
  label,
  onRowToggle,
  onEdit,
  onDelete,
  editLabel,
  editTitle,
  deleteLabel,
  deleteTitle,
  children,
}) {
  const handleRowClick = (e) => {
    if (editing) return;
    // 忽略来自交互子元素（按钮 / 勾选框）的点击，避免误触
    if (e.target.closest("button") || e.target.closest(".checkbox-wrap")) return;
    onRowToggle?.();
  };

  const className = `${baseClass} ${isNew ? "new" : ""} ${
    removing ? "removing" : ""
  } ${editing ? "editing" : ""} ${selected ? "selected" : ""}`;

  return (
    <div
      className={className}
      role="listitem"
      aria-label={label}
      onClick={handleRowClick}
    >
      {children}

      {!editing && (
        <button
          className="edit-btn"
          onClick={onEdit}
          aria-label={editLabel}
          title={editTitle}
        >
          ✎
        </button>
      )}

      <button
        className="delete-btn"
        onClick={onDelete}
        aria-label={deleteLabel}
        title={deleteTitle}
      >
        ×
      </button>
    </div>
  );
}
