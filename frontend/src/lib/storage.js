import { useEffect, useState } from "react";

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/** useState that survives reloads. Storage failures (private mode, quota) are ignored. */
export function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: keep working in memory */
    }
  }, [key, value]);
  return [value, setValue];
}
