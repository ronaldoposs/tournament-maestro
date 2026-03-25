import { useSyncExternalStore, useCallback } from "react";
import { store } from "@/lib/store";

export function useStore<T>(selector: (s: typeof store) => T): T {
  const getSnapshot = useCallback(() => selector(store), [selector]);
  return useSyncExternalStore(store.subscribe, getSnapshot);
}
