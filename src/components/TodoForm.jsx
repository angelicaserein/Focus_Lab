import React, { useState, useEffect, useRef } from "react";
import { useTodos } from "../context/TodoContext";
import RecurringDayPicker, { recurringLabel } from "./RecurringDayPicker";
import useOutsideClick from "../hooks/useOutsideClick";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function TodoForm({ forceRecurring = false }) {
  const { addTodo } = useTodos();
  const [text, setText] = useState("");
  const [recurringDays, setRecurringDays] = useState(null);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setRecurringDays(forceRecurring ? ALL_DAYS : null);
    setShowDayPicker(false);
  }, [forceRecurring]);

  useOutsideClick(wrapRef, () => setShowDayPicker(false), showDayPicker);

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const days = forceRecurring
      ? (recurringDays?.length ? recurringDays : ALL_DAYS)
      : recurringDays;
    addTodo(t, { recurringDays: days?.length ? days : null });
    setText("");
    if (!forceRecurring) {
      setRecurringDays(null);
      setShowDayPicker(false);
    }
  };

  const label = recurringLabel(recurringDays ?? []);
  const isActive = !!recurringDays?.length;

  return (
    <div className="todo-form-section" ref={wrapRef}>
      <form className="todo-form" onSubmit={submit}>
        <input
          className="todo-input"
          placeholder={forceRecurring ? "添加固定任务…" : "添加任务，按回车或点击添加"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={forceRecurring ? "新增固定任务" : "新增任务"}
        />
        <button
          type="button"
          className={`recurring-toggle${isActive ? " active" : ""}`}
          onClick={() => setShowDayPicker(v => !v)}
          title={isActive ? `固定：${label}` : "设置重复日期"}
          aria-pressed={isActive}
        >
          ↺{isActive && <span className="recurring-btn-label">{label}</span>}
        </button>
        <button
          type="submit"
          className="add-btn"
          aria-label="添加任务按钮"
        >
          添加
        </button>
      </form>
      {showDayPicker && (
        <RecurringDayPicker
          days={recurringDays ?? []}
          onChange={(d) => setRecurringDays(d?.length ? d : null)}
          onClose={() => setShowDayPicker(false)}
        />
      )}
    </div>
  );
}
