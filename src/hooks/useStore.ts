import { useState, useEffect, useRef } from "react";
import { store } from "@/lib/store";

export function useStore<T>(selector: (s: typeof store) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const [value, setValue] = useState(() => selector(store));

  useEffect(() => {
    setValue(selectorRef.current(store));

    const unsub = store.subscribe(() => {
      setValue(selectorRef.current(store));
    });
    return () => { unsub(); };
  }, []);

  return value;
}
