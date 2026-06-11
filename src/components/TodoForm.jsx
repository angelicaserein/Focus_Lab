import React, { useState } from "react";
import { useTodos } from "../context/TodoContext";

export default function TodoForm() {
  const { addTodo } = useTodos();
  const [text, setText] = useState("");

  const submit = (e) => {
    e && e.preventDefault();
    const t = text.trim();
    if (!t) return;
    addTodo(t);
    setText("");
  };

  return (
    <form className="todo-form" onSubmit={submit}>
      <input
        className="todo-input"
        placeholder="添加任务，按回车或点击添加"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // 支持回车提交
          if (e.key === "Enter") {
            submit(e);
          }
        }}
        aria-label="新增任务"
      />
      <button
        type="button"
        className="add-btn"
        onClick={submit}
        aria-label="添加任务按钮"
      >
        添加
      </button>
    </form>
  );
}
