import { attrName as dbName } from "@/utils/task/taskAttrUtils";
import React, { useState, useRef, useEffect } from "react";
import { useDatabases, DEFAULT_DB_ID } from "@/context/DatabaseContext";
import { useTodos } from "@/context/TodoContext";
import { useLanguage } from "@/context/LanguageContext";
import Popover from "@/components/ui/Popover";
import DatabaseCreateDialog from "@/pages/Tasks/DatabaseCreateDialog";
import useConfirm from "@/hooks/common/useConfirm";
import "./DatabaseTabs.css";

export default function DatabaseTabs() {
  const {
    databases,
    activeDatabaseId,
    setActiveDatabase,
    renameDatabase,
    deleteDatabase,
  } = useDatabases();
  const { deleteTodosByDatabase } = useTodos();
  const { t } = useLanguage();
  const [confirm, confirmDialog] = useConfirm();

  const sorted = [...databases].sort((a, b) => a.order - b.order);

  const [menuFor, setMenuFor] = useState(null);     // db id whose ⋯ menu is open
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [createAnchor, setCreateAnchor] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const renameRef = useRef(null);

  useEffect(() => { if (renamingId) renameRef.current?.focus(); }, [renamingId]);

  const openMenu = (db, el) => { setMenuFor(db.id); setMenuAnchor(el); };
  const closeMenu = () => { setMenuFor(null); setMenuAnchor(null); };

  const startRename = (db) => {
    closeMenu();
    setRenamingId(db.id);
    setRenameText(dbName(t, db));
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) renameDatabase(renamingId, renameText.trim());
    setRenamingId(null);
  };

  const handleDelete = async (db) => {
    closeMenu();
    if (db.id === DEFAULT_DB_ID) return;
    const ok = await confirm({
      title: t("tasks.db.confirmDelete", { name: dbName(t, db) }),
      message: t("tasks.db.confirmDeleteDetail"),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    deleteTodosByDatabase(db.id);
    deleteDatabase(db.id);
  };

  return (
    <div className="db-tabs">
      {sorted.map(db => {
        const isActive = db.id === activeDatabaseId;
        if (renamingId === db.id) {
          return (
            <input
              key={db.id}
              ref={renameRef}
              className="db-tab-rename"
              value={renameText}
              onChange={e => setRenameText(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingId(null);
              }}
            />
          );
        }
        return (
          <div key={db.id} className={`db-tab${isActive ? " active" : ""}`}>
            <button
              className="db-tab-label"
              onClick={() => setActiveDatabase(db.id)}
              onDoubleClick={() => startRename(db)}
              title={dbName(t, db)}
            >
              {dbName(t, db)}
            </button>
            {isActive && (
              <button
                className="db-tab-menu-btn"
                type="button"
                title={t("tasks.db.options")}
                onClick={e => openMenu(db, e.currentTarget)}
              >⋯</button>
            )}
          </div>
        );
      })}

      <button
        className="db-tab-add"
        type="button"
        title={t("tasks.db.create")}
        onClick={e => setCreateAnchor(e.currentTarget)}
      >{t("tasks.db.createShort")}</button>

      {menuFor && (
        <Popover anchorEl={menuAnchor} onClose={closeMenu} className="db-tab-menu">
          {(() => {
            const db = sorted.find(d => d.id === menuFor);
            if (!db) return null;
            return (
              <>
                <button type="button" className="db-menu-item" onClick={() => startRename(db)}>
                  {t("tasks.db.rename")}
                </button>
                <button
                  className="db-menu-item danger"
                  onClick={() => handleDelete(db)}
                  disabled={db.id === DEFAULT_DB_ID}
                  title={db.id === DEFAULT_DB_ID ? t("tasks.db.deleteDefault") : t("tasks.db.delete")}
                >{t("tasks.delete")}</button>
              </>
            );
          })()}
        </Popover>
      )}

      {createAnchor && (
        <DatabaseCreateDialog
          anchorEl={createAnchor}
          onClose={() => setCreateAnchor(null)}
        />
      )}

      {confirmDialog}
    </div>
  );
}
