import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";
import useEditMode from "@/hooks/common/useEditMode";
import { hasScenarioSettings } from "@/utils/scenario/scenarioConstants";
import { onActivateKey } from "@/utils/a11y";

export default function ScenarioItem({ scenario, settingsOpen, onToggleSettings }) {
  const { deleteScenario, editScenario, activeScenarioId, setActiveScenario } =
    useScenarios();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [removing, setRemoving] = useState(false);
  const [draftDesc, setDraftDesc] = useState(scenario.description || "");

  const { editing, draft: draftTitle, setDraft: setDraftTitle, startEdit, commitEdit, cancelEdit, inputRef: titleInputRef } =
    useEditMode(scenario.title);

  const isNew = useMemo(() => {
    if (!scenario.createdAt) return false;
    return Date.now() - scenario.createdAt < 2000;
  }, [scenario.createdAt]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => deleteScenario(scenario.id), 320);
  };

  const handleStartEdit = (e) => {
    setDraftDesc(scenario.description || "");
    startEdit(e);
  };

  const handleCommitEdit = () =>
    commitEdit((title) => {
      if (!title) { cancelEdit(); return; }
      if (title !== scenario.title || draftDesc.trim() !== (scenario.description || "")) {
        editScenario(scenario.id, title, draftDesc);
      }
    });

  const handleCancelEdit = () => {
    setDraftDesc(scenario.description || "");
    cancelEdit();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleCommitEdit(); }
    else if (e.key === "Escape") { e.preventDefault(); handleCancelEdit(); }
  };

  const handleQuickStart = (e) => {
    e.stopPropagation();
    navigate("/focus", { state: { scenarioId: scenario.id } });
  };

  const handleRowClick = (e) => {
    if (editing) return;
    if (e.target.closest("button")) return;
    // 点当前情景再点一次 = 退出（回到「无情景」）。
    setActiveScenario(activeScenarioId === scenario.id ? null : scenario.id);
  };

  const hasSettings = hasScenarioSettings(scenario);

  return (
    <div
      className={`scenario-item ${isNew ? "new" : ""} ${
        removing ? "removing" : ""
      } ${editing ? "editing" : ""} ${
        activeScenarioId === scenario.id ? "selected" : ""
      }`}
      // 整块是个「切换当前情景」的开关：role 用 button，aria-pressed 才生效
      // （listitem 不认这个属性）。里面嵌着按钮，做不成原生 <button>，
      // 于是 tabIndex + 键盘激活都得自己补。
      role="button"
      aria-label={scenario.title}
      aria-pressed={activeScenarioId === scenario.id}
      tabIndex={editing ? -1 : 0}
      onClick={handleRowClick}
      onKeyDown={onActivateKey(() => {
        if (!editing) setActiveScenario(activeScenarioId === scenario.id ? null : scenario.id);
      })}
    >
      {editing ? (
        <div className="scenario-edit">
          <input
            ref={titleInputRef}
            className="scenario-edit-input"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("scenario.item.editTitleAria")}
          />
          <input
            className="scenario-edit-input"
            value={draftDesc}
            placeholder={t("scenario.form.descPlaceholder")}
            onChange={(e) => setDraftDesc(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCommitEdit}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("scenario.item.editDescAria")}
          />
        </div>
      ) : (
        <div className="scenario-body">
          <div className="scenario-title">{scenario.title}</div>
          {scenario.description ? (
            <div className="scenario-desc">{scenario.description}</div>
          ) : null}
        </div>
      )}

      {!editing && (
        <>
          <button
            className="scenario-quickstart-btn"
            onClick={handleQuickStart}
            aria-label={t("scenario.item.quickStartAria", { name: scenario.title })}
            title={t("scenario.item.quickStartTitle")}
          >
            ▶
          </button>
          <button
            className={`scenario-settings-btn${hasSettings ? " active" : ""}${settingsOpen ? " open" : ""}`}
            onClick={(e) => { e.stopPropagation(); onToggleSettings(); }}
            aria-label={t("scenario.item.settingsAria")}
            aria-pressed={settingsOpen}
            title={t("scenario.item.settingsAria")}
          >
            ⚙
          </button>
          <button
            className="edit-btn"
            onClick={handleStartEdit}
            aria-label={t("scenario.item.editAria", { name: scenario.title })}
            title={t("scenario.item.editTitle")}
          >
            ✎
          </button>
        </>
      )}

      <button
        className="delete-btn"
        onClick={handleDelete}
        aria-label={t("scenario.item.deleteAria", { name: scenario.title })}
        title={t("scenario.item.deleteTitle")}
      >
        ×
      </button>
    </div>
  );
}
