import React, { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import ScenarioSettings from "./ScenarioSettings";
import useOutsideClick from "../../hooks/useOutsideClick";
import useEditMode from "../../hooks/useEditMode";

export default function ScenarioItem({ scenario }) {
  const { deleteScenario, editScenario, selectedIds, toggleSelect } =
    useScenarios();
  const navigate = useNavigate();

  const [removing, setRemoving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draftDesc, setDraftDesc] = useState(scenario.description || "");
  const wrapRef = useRef(null);

  const { editing, draft: draftTitle, setDraft: setDraftTitle, startEdit, commitEdit, cancelEdit, inputRef: titleInputRef } =
    useEditMode(scenario.title);

  const isNew = useMemo(() => {
    if (!scenario.createdAt) return false;
    return Date.now() - scenario.createdAt < 2000;
  }, [scenario.createdAt]);

  useOutsideClick(wrapRef, () => setShowSettings(false), showSettings);

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
    toggleSelect(scenario.id);
  };

  const hasSettings =
    scenario.settings &&
    (scenario.settings.devices?.length > 0 ||
      scenario.settings.communication ||
      scenario.settings.taskTypes?.length > 0);

  return (
    <div
      className={`scenario-item-wrap${showSettings ? " settings-open" : ""}`}
      ref={wrapRef}
    >
    <div
      className={`scenario-item ${isNew ? "new" : ""} ${
        removing ? "removing" : ""
      } ${editing ? "editing" : ""} ${
        selectedIds.includes(scenario.id) ? "selected" : ""
      }`}
      role="listitem"
      aria-label={scenario.title}
      onClick={handleRowClick}
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
            aria-label="编辑情景名称"
          />
          <input
            className="scenario-edit-input"
            value={draftDesc}
            placeholder="描述（选填）"
            onChange={(e) => setDraftDesc(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCommitEdit}
            onClick={(e) => e.stopPropagation()}
            aria-label="编辑情景描述"
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
            aria-label={`开始专注 ${scenario.title}`}
            title="创建任务并前往专注"
          >
            ▶
          </button>
          <button
            className={`scenario-settings-btn${hasSettings ? " active" : ""}${showSettings ? " open" : ""}`}
            onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
            aria-label="情景设置"
            aria-pressed={showSettings}
            title="情景设置"
          >
            ⚙
          </button>
          <button
            className="edit-btn"
            onClick={handleStartEdit}
            aria-label={`编辑 ${scenario.title}`}
            title="编辑情景"
          >
            ✎
          </button>
        </>
      )}

      <button
        className="delete-btn"
        onClick={handleDelete}
        aria-label={`删除 ${scenario.title}`}
        title="删除情景"
      >
        ×
      </button>
    </div>

    {showSettings && <ScenarioSettings scenario={scenario} />}
    </div>
  );
}
