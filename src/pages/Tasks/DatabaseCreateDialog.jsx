import React, { useState } from "react";
import Popover from "@/components/ui/Popover";
import { useDatabases } from "@/context/DatabaseContext";
import { DATABASE_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/utils/task/databaseTemplates";
import { useLanguage } from "@/context/LanguageContext";

export default function DatabaseCreateDialog({ anchorEl, onClose }) {
  const { addDatabase } = useDatabases();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);

  const handleCreate = () => {
    addDatabase(name.trim(), templateId);
    onClose();
  };

  return (
    <Popover anchorEl={anchorEl} onClose={onClose}>
      <div className="db-create-dialog" onClick={e => e.stopPropagation()}>
        <div className="db-create-title">{t("tasks.db.create")}</div>

        <div className="db-create-field">
          <label className="db-create-label">{t("tasks.attr.nameLabel")}</label>
          <input
            className="db-create-input"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onClose(); }}
            placeholder={t("tasks.db.namePlaceholder")}
          />
        </div>

        <div className="db-create-field">
          <label className="db-create-label">{t("tasks.db.template")}</label>
          <div className="db-template-list">
            {DATABASE_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                className={`db-template-opt${templateId === tpl.id ? " active" : ""}`}
                onClick={() => setTemplateId(tpl.id)}
              >
                <span className="db-template-name">{t(tpl.nameKey)}</span>
                <span className="db-template-desc">{t(tpl.descKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="db-create-footer">
          <button className="db-create-confirm" onClick={handleCreate}>{t("tasks.db.confirmCreate")}</button>
          <button className="db-create-cancel" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </Popover>
  );
}
