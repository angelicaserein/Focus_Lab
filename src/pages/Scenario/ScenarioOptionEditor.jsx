import React, { useState } from "react";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";
import { optionLabel } from "@/utils/task/taskAttrUtils";

// 一个「可自定义选项 + 选择」的小节：设备 / 交流规则共用。
// 选项表是全局的（编辑影响所有情境），选中状态是当前情境的。
export default function ScenarioOptionEditor({
  title,
  kind,
  options,
  selected,
  multi,
  withIcon,
  onToggle,
}) {
  const { addScenarioOption, updateScenarioOption, removeScenarioOption } = useScenarios();
  // 出厂选项的文案在 i18n 里（labelKey），用户自建/改过名的才有 label
  const { t } = useLanguage();
  const [managing, setManaging] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("");

  const isSelected = (id) =>
    multi ? selected.includes(id) : selected === id;

  const commitNew = () => {
    if (!newLabel.trim()) return;
    addScenarioOption(kind, { label: newLabel, icon: withIcon ? newIcon.trim() : undefined });
    setNewLabel("");
    setNewIcon("");
  };

  return (
    <div className="settings-section">
      <div className="settings-label-row">
        <span className="settings-label">{title}</span>
        <button
          type="button"
          className={`settings-manage-btn${managing ? " active" : ""}`}
          onClick={() => setManaging((v) => !v)}
          aria-pressed={managing}
          title={managing ? t("scenario.opt.doneTitle") : t("scenario.opt.editTitle")}
        >
          {managing ? t("scenario.opt.done") : t("scenario.opt.edit")}
        </button>
      </div>

      {managing ? (
        <div className="settings-option-edit">
          {options.map((opt) => (
            <div key={opt.id} className="option-edit-row">
              {withIcon && (
                <input
                  className="option-icon-input"
                  value={opt.icon ?? ""}
                  maxLength={2}
                  placeholder="🙂"
                  onChange={(e) => updateScenarioOption(kind, opt.id, { icon: e.target.value })}
                  aria-label={t("scenario.opt.iconAria")}
                />
              )}
              <input
                className="option-label-input"
                value={optionLabel(t, opt)}
                onChange={(e) => updateScenarioOption(kind, opt.id, { label: e.target.value })}
                aria-label={t("scenario.opt.nameAria")}
              />
              <button
                type="button"
                className="option-remove"
                onClick={() => removeScenarioOption(kind, opt.id)}
                title={t("scenario.opt.removeTitle")}
              >
                ×
              </button>
            </div>
          ))}

          <div className="option-edit-row option-add-row">
            {withIcon && (
              <input
                className="option-icon-input"
                value={newIcon}
                maxLength={2}
                placeholder="🙂"
                onChange={(e) => setNewIcon(e.target.value)}
                aria-label={t("scenario.opt.newIconAria")}
              />
            )}
            <input
              className="option-label-input"
              value={newLabel}
              placeholder={t("scenario.opt.newNamePlaceholder")}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitNew(); }}
              aria-label={t("scenario.opt.newNameAria")}
            />
            <button
              type="button"
              className="option-add-btn"
              onClick={commitNew}
              disabled={!newLabel.trim()}
            >
              {t("scenario.opt.add")}
            </button>
          </div>
        </div>
      ) : (
        <div className="settings-chips">
          {options.length === 0 ? (
            <span className="settings-empty-hint">{t("scenario.opt.empty")}</span>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`settings-chip${isSelected(opt.id) ? " active" : ""}`}
                onClick={() => onToggle(opt.id)}
              >
                {opt.icon ? `${opt.icon} ` : ""}{optionLabel(t, opt)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
