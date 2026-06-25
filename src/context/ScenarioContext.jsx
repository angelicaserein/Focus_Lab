import React, { useContext } from "react";
import useUndoableList from "../hooks/useUndoableList";

const STORAGE_KEY = "scenarios_v1";
const CURRENT_VERSION = 1;

const ScenarioContext = React.createContext(null);

export function ScenarioProvider({ children }) {
  // 选中高亮（多选）——仅本页面使用，不持久化
  const [selectedIds, setSelectedIds] = React.useState([]);

  const {
    items: scenarios,
    add,
    patch,
    remove,
    undoDelete,
    pendingDelete,
  } = useUndoableList({
    storageKey: STORAGE_KEY,
    version: CURRENT_VERSION,
    // 删除时若该情景被选中则取消选中；撤销时恢复选中状态
    onRemove: (item, meta) => {
      if (meta.wasSelected) setSelectedIds((prev) => prev.filter((x) => x !== item.id));
    },
    onRestore: (item, meta) => {
      if (meta.wasSelected) setSelectedIds((prev) => [...prev, item.id]);
    },
  });

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const addScenario = (title, description = "") => {
    const t = title.trim();
    if (!t) return;
    add({
      id: crypto.randomUUID(),
      title: t,
      description: description.trim(),
      createdAt: Date.now(),
    });
  };

  const editScenario = (id, title, description = "") => {
    const t = title.trim();
    if (!t) return;
    patch(id, { title: t, description: description.trim() });
  };

  const deleteScenario = (id) => {
    remove(id, { wasSelected: selectedIds.includes(id) });
  };

  const value = {
    scenarios,
    addScenario,
    editScenario,
    deleteScenario,
    pendingDelete,
    undoDelete,
    selectedIds,
    toggleSelect,
  };

  return (
    <ScenarioContext.Provider value={value}>
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenarios() {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenarios must be used within ScenarioProvider");
  return ctx;
}
