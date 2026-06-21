import { useCallback, useRef } from "react";

export default function useSessionEvents() {
  const ref = useRef([]);

  const logEvent = useCallback((type, data = {}) => {
    ref.current.push({ type, ts: Date.now(), ...data });
  }, []);

  const resetEvents = useCallback(() => {
    ref.current = [];
  }, []);

  const getSnapshot = useCallback(() => [...ref.current], []);

  return { logEvent, resetEvents, getSnapshot };
}
