import React from "react";
import { useTodos } from "../context/TodoContext";
import { useLanguage } from "../context/LanguageContext";

export default function TodoStats() {
  const { todos } = useTodos();
  const { t } = useLanguage();
  const total = todos.length;
  const done = todos.filter((td) => td.completed).length;
  return (
    <div className="stats" aria-live="polite">
      {t("todo.stats", { done, total })}
    </div>
  );
}
