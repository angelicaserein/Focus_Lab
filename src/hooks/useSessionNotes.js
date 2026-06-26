import { useMemo } from "react";
import useLocalStorage from "./useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";

// 管理随记列表及本次会话随记子集。
// sessionStartTs 留在调用方（FocusPage）因为同时被 useSessionLifecycle 消费。
export default function useSessionNotes({ sessionStartTs, getSession, focusedTodoIds }) {
  const [notes, setNotes] = useLocalStorage(STORAGE_KEYS.NOTES, []);

  const sessionNotes = useMemo(
    () => notes.filter((n) => sessionStartTs && n.ts >= sessionStartTs),
    [notes, sessionStartTs],
  );

  const addNote = (text) => {
    const { sessionId } = getSession();
    setNotes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, ts: Date.now(), sessionId, taskIds: [...focusedTodoIds] },
    ]);
  };

  return { notes, sessionNotes, addNote };
}
