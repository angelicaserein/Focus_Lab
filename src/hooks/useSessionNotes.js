import { useCallback, useMemo } from "react";
import useLocalStorage from "./useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { filterSinceSession, makeSessionEntry } from "../utils/focusRecords";

// 管理随记列表及本次会话随记子集。
// sessionStartTs 留在调用方（FocusPage）因为同时被 useSessionLifecycle 消费。
export default function useSessionNotes({ sessionStartTs, getSession, focusedTodoIds }) {
  const [notes, setNotes] = useLocalStorage(STORAGE_KEYS.NOTES, []);

  const sessionNotes = useMemo(
    () => filterSinceSession(notes, sessionStartTs),
    [notes, sessionStartTs],
  );

  const addNote = useCallback((text) => {
    const { sessionId } = getSession();
    setNotes((prev) => [...prev, makeSessionEntry({ text }, { sessionId, focusedTodoIds })]);
  }, [getSession, focusedTodoIds, setNotes]);

  return { notes, sessionNotes, addNote };
}
