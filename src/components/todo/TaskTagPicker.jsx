import React from "react";
import { TASK_TYPE_OPTIONS } from "@/utils/scenario/scenarioConstants";
import { useLanguage } from "@/context/LanguageContext";
import { optionLabel } from "@/utils/task/taskAttrUtils";

export default function TaskTagPicker({ tags = [], options = TASK_TYPE_OPTIONS, onChange, onClose }) {
  const { t } = useLanguage();
  const toggleTag = (id) => {
    const newTags = tags.includes(id)
      ? tags.filter((t) => t !== id)
      : [...tags, id];
    onChange(newTags);
  };

  const clear = () => {
    onChange([]);
    onClose();
  };

  return (
    <div className="task-tag-picker">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`day-btn${tags.includes(opt.id) ? " active" : ""}`}
          onClick={() => toggleTag(opt.id)}
        >
          {opt.icon && <span>{opt.icon}</span>} {optionLabel(t, opt)}
        </button>
      ))}
      <button type="button" className="day-cancel-btn" onClick={clear}>
        {t("todo.clearTags")}
      </button>
    </div>
  );
}
