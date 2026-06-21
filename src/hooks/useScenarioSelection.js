import { useState, useCallback } from "react";

export default function useScenarioSelection() {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = useCallback(
    (id) => setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    ),
    [],
  );

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const removeFromSelection = useCallback(
    (id) => setSelectedIds((prev) => prev.filter((x) => x !== id)),
    [],
  );

  const restoreToSelection = useCallback(
    (id) => setSelectedIds((prev) => [...prev, id]),
    [],
  );

  return { selectedIds, toggleSelect, clearSelection, removeFromSelection, restoreToSelection };
}
