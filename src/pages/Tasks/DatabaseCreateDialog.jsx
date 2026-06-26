import React, { useState } from "react";
import Popover from "../../components/Popover";
import { useDatabases } from "../../context/DatabaseContext";
import { DATABASE_TEMPLATES, DEFAULT_TEMPLATE_ID } from "../../utils/databaseTemplates";

export default function DatabaseCreateDialog({ anchorEl, onClose }) {
  const { addDatabase } = useDatabases();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);

  const handleCreate = () => {
    addDatabase(name.trim() || "新建库", templateId);
    onClose();
  };

  return (
    <Popover anchorEl={anchorEl} onClose={onClose}>
      <div className="db-create-dialog" onClick={e => e.stopPropagation()}>
        <div className="db-create-title">新建 Database</div>

        <div className="db-create-field">
          <label className="db-create-label">名称</label>
          <input
            className="db-create-input"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onClose(); }}
            placeholder="例如：阅读清单"
          />
        </div>

        <div className="db-create-field">
          <label className="db-create-label">模板</label>
          <div className="db-template-list">
            {DATABASE_TEMPLATES.map(t => (
              <button
                key={t.id}
                className={`db-template-opt${templateId === t.id ? " active" : ""}`}
                onClick={() => setTemplateId(t.id)}
              >
                <span className="db-template-name">{t.name}</span>
                <span className="db-template-desc">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="db-create-footer">
          <button className="db-create-confirm" onClick={handleCreate}>创建</button>
          <button className="db-create-cancel" onClick={onClose}>取消</button>
        </div>
      </div>
    </Popover>
  );
}
