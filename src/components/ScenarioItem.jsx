import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScenarios } from "../context/ScenarioContext";

export default function ScenarioItem({ scenario }) {
  const { deleteScenario, editScenario, selectedIds, toggleSelect } =
    useScenarios();
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(scenario.title);
  const [draftDesc, setDraftDesc] = useState(scenario.description || "");
  const titleInputRef = useRef(null);

  const isNew = useMemo(() => {
    if (!scenario.createdAt) return false;
    return Date.now() - scenario.createdAt < 2000;
  }, [scenario.createdAt]);

  useEffect(() => {
    if (editing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editing]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => deleteScenario(scenario.id), 320);
  };

  const startEdit = (e) => {
    e.stopPropagation();
    setDraftTitle(scenario.title);
    setDraftDesc(scenario.description || "");
    setEditing(true);
  };

  const commitEdit = () => {
    const t = draftTitle.trim();
    if (!t) {
      cancelEdit();
      return;
    }
    if (t !== scenario.title || draftDesc.trim() !== (scenario.description || "")) {
      editScenario(scenario.id, t, draftDesc);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraftTitle(scenario.title);
    setDraftDesc(scenario.description || "");
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleQuickStart = (e) => {
    e.stopPropagation();
    navigate("/focus");
  };

  const handleRowClick = (e) => {
    if (editing) return;
    // 忽略来自交互子元素的点击，避免误触
    if (e.target.closest("button")) return;
    toggleSelect(scenario.id);
  };

  return (
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
            className="edit-btn"
            onClick={startEdit}
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
