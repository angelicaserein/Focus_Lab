import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import useEditMode from "../../hooks/useEditMode";
import { hasScenarioSettings } from "../../utils/scenarioConstants";

export default function ScenarioItem({ scenario, settingsOpen, onToggleSettings }) {
  const { deleteScenario, editScenario, activeScenarioId, setActiveScenario } =
    useScenarios();
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
      role="listitem"
      aria-label={scenario.title}
      aria-pressed={activeScenarioId === scenario.id}
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
            aria-label={`前往专注，预选情景 ${scenario.title}`}
            title="前往专注（预选此情景）"
          >
            ▶
          </button>
          <button
            className={`scenario-settings-btn${hasSettings ? " active" : ""}${settingsOpen ? " open" : ""}`}
            onClick={(e) => { e.stopPropagation(); onToggleSettings(); }}
            aria-label="情景设置"
            aria-pressed={settingsOpen}
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
  );
}
