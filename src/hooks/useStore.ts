import { useRef, useCallback, useSyncExternalStore } from "react";
import { store } from "@/lib/store";

export function useStore<T>(selector: (s: typeof store) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = useCallback(() => selectorRef.current(store), []);

  return useSyncExternalStore(store.subscribe, getSnapshot);
}
