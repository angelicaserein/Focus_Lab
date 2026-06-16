import React, { useState } from "react";
import { useTodos } from "../context/TodoContext";

export default function TodoForm({ forceRecurring = false }) {
  const { addTodo } = useTodos();
  const [text, setText] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    addTodo(t, { recurring: forceRecurring || isRecurring });
    setText("");
    setIsRecurring(false);
  };

  return (
    <form className="todo-form" onSubmit={submit}>
      <input
        className="todo-input"
        placeholder={forceRecurring ? "添加每日固定任务…" : "添加任务，按回车或点击添加"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={forceRecurring ? "新增每日固定任务" : "新增任务"}
      />
      {!forceRecurring && (
        <button
          type="button"
          className={`recurring-toggle${isRecurring ? " active" : ""}`}
          onClick={() => setIsRecurring(v => !v)}
          title={isRecurring ? "取消每天重复" : "设为每天重复"}
          aria-pressed={isRecurring}
        >
          ↺
        </button>
      )}
      <button
        type="submit"
        className="add-btn"
        aria-label="添加任务按钮"
      >
        添加
      </button>
    </form>
  );
}
