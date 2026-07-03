import React, { useState, useRef, useEffect } from "react";
import { useDatabases, DEFAULT_DB_ID } from "@/context/DatabaseContext";
import { useTodos } from "@/context/TodoContext";
import Popover from "@/components/ui/Popover";
import DatabaseCreateDialog from "@/pages/Tasks/DatabaseCreateDialog";
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
    setRenameText(db.name);
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) renameDatabase(renamingId, renameText.trim());
    setRenamingId(null);
  };

  const handleDelete = (db) => {
    closeMenu();
    if (db.id === DEFAULT_DB_ID) return;
    if (window.confirm(`删除 database「${db.name}」？其下所有任务也会被删除。`)) {
      deleteTodosByDatabase(db.id);
      deleteDatabase(db.id);
    }
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
              title={db.name}
            >
              {db.name}
            </button>
            {isActive && (
              <button
                className="db-tab-menu-btn"
                title="库选项"
                onClick={e => openMenu(db, e.currentTarget)}
              >⋯</button>
            )}
          </div>
        );
      })}

      <button
        className="db-tab-add"
        title="新建 database"
        onClick={e => setCreateAnchor(e.currentTarget)}
      >+ 新建</button>

      {menuFor && (
        <Popover anchorEl={menuAnchor} onClose={closeMenu} className="db-tab-menu">
          {(() => {
            const db = sorted.find(d => d.id === menuFor);
            if (!db) return null;
            return (
              <>
                <button className="db-menu-item" onClick={() => startRename(db)}>重命名</button>
                <button
                  className="db-menu-item danger"
                  onClick={() => handleDelete(db)}
                  disabled={db.id === DEFAULT_DB_ID}
                  title={db.id === DEFAULT_DB_ID ? "默认库不可删除" : "删除此库"}
                >删除</button>
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
    </div>
  );
}
