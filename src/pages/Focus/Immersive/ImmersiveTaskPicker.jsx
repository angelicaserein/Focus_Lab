import React, { useState } from "react";
import "./ImmersiveTaskPicker.css";

// 沉浸式卡片的任务选择器：用于「添加任务」或「替换某行任务」。
//   - 顶部输入框：回车新建一个任务并加入本次专注（onCreate）。
//   - 下方列出可选的已有任务，点一项即选中（onPick）。
// 由 ImmersiveView 控制展开/收起；mode 仅用于占位文案的措辞。
export default function ImmersiveTaskPicker({
  availableTodos,
  mode, // "add" | "replace"
  onPick,
  onCreate,
  onClose,
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onCreate(text);
    setDraft("");
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="immersive-task-picker">
      <input
        className="immersive-picker-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={mode === "replace" ? "输入新任务替换…" : "输入新任务，回车添加…"}
        aria-label="新建任务"
        autoFocus
      />

      {/* 直接从任务列表（todolist）里挑 —— 与 Focus 页右侧清单同源 */}
      <div className="immersive-picker-label">从任务列表选择</div>
      {availableTodos.length > 0 ? (
        <ul className="immersive-picker-list">
          {availableTodos.map((todo) => (
            <li key={todo.id}>
              <button
                type="button"
                className="immersive-picker-option"
                onClick={() => {
                  onPick(todo.id);
                  onClose();
                }}
                title={todo.text}
              >
                {todo.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="immersive-picker-empty">任务列表里没有更多可选任务</p>
      )}
    </div>
  );
}
