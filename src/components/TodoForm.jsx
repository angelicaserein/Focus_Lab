import React, { useState } from "react";
import { useTodos } from "../context/TodoContext";

export default function TodoForm() {
  const { addTodo } = useTodos();
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
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
        aria-label="新增任务"
      />
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
