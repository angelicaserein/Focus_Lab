import React, { useState, useEffect, useRef } from "react";
import { useTodos } from "../context/TodoContext";
import { useLanguage } from "../context/LanguageContext";
import RecurringDayPicker, { recurringLabel } from "./RecurringDayPicker";
import useOutsideClick from "../hooks/useOutsideClick";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function TodoForm({ forceRecurring = false }) {
  const { addTodo } = useTodos();
  const { t } = useLanguage();
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

  const label = recurringLabel(recurringDays ?? [], t);
  const isActive = !!recurringDays?.length;

  return (
    <div className="todo-form-section" ref={wrapRef}>
      <form className="todo-form" onSubmit={submit}>
        <input
          className="todo-input"
          placeholder={forceRecurring ? t("todo.form.addRecurringPlaceholder") : t("todo.form.addPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={forceRecurring ? t("todo.form.newRecurringAria") : t("todo.form.newTaskAria")}
        />
        <button
          type="button"
          className={`recurring-toggle${isActive ? " active" : ""}`}
          onClick={() => setShowDayPicker(v => !v)}
          title={isActive ? t("todo.form.recurringSet", { label }) : t("todo.form.setRecurring")}
          aria-pressed={isActive}
        >
          ↺{isActive && <span className="recurring-btn-label">{label}</span>}
        </button>
        <button
          type="submit"
          className="add-btn"
          aria-label={t("todo.form.addAria")}
        >
          {t("todo.form.add")}
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
