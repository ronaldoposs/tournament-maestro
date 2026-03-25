import { useState, useEffect, useCallback } from "react";
import { store } from "@/lib/store";

export function useStore<T>(selector: (s: typeof store) => T): T {
  const [value, setValue] = useState(() => selector(store));

  const stableSelector = useCallback(selector, []);

  useEffect(() => {
    // Update immediately in case store changed between render and effect
    setValue(stableSelector(store));

    const unsub = store.subscribe(() => {
      setValue(stableSelector(store));
    });
    return unsub;
  }, [stableSelector]);

  return value;
}
