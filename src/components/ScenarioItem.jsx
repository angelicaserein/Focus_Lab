import React, { useState } from "react";
import { useScenarios } from "../context/ScenarioContext";
import useEditableItem from "../hooks/useEditableItem";
import EditableItemShell from "./EditableItemShell";

export default function ScenarioItem({ scenario }) {
  const { deleteScenario, editScenario, selectedIds, toggleSelect } =
    useScenarios();
  const [draftTitle, setDraftTitle] = useState(scenario.title);
  const [draftDesc, setDraftDesc] = useState(scenario.description || "");

  const resetDrafts = () => {
    setDraftTitle(scenario.title);
    setDraftDesc(scenario.description || "");
  };

  const {
    removing,
    editing,
    isNew,
    inputRef: titleInputRef,
    handleDelete,
    startEdit,
    commitEdit,
    handleKeyDown,
  } = useEditableItem({
    createdAt: scenario.createdAt,
    onDelete: () => deleteScenario(scenario.id),
    onEditStart: resetDrafts,
    onCommit: () => {
      const t = draftTitle.trim();
      if (!t) {
        resetDrafts();
        return;
      }
      if (t !== scenario.title || draftDesc.trim() !== (scenario.description || "")) {
        editScenario(scenario.id, t, draftDesc);
      }
    },
    onCancel: resetDrafts,
  });

  return (
    <EditableItemShell
      baseClass="scenario-item"
      isNew={isNew}
      removing={removing}
      editing={editing}
      selected={selectedIds.includes(scenario.id)}
      label={scenario.title}
      onRowToggle={() => toggleSelect(scenario.id)}
      onEdit={startEdit}
      onDelete={handleDelete}
      editLabel={`编辑 ${scenario.title}`}
      editTitle="编辑情景"
      deleteLabel={`删除 ${scenario.title}`}
      deleteTitle="删除情景"
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
            onBlur={commitEdit}
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
    </EditableItemShell>
  );
}
