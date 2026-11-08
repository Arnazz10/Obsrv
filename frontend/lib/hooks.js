'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getJson } from './api';

/** Poll a JSON endpoint. Pauses while the tab is hidden; keeps last good data on failure. */
export function useLive(path, { interval = 5000, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null });
  const alive = useRef(true);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    try {
      const data = await getJson(path);
      if (alive.current && id === seq.current) setState({ data, error: null, loading: false, updatedAt: Date.now() });
    } catch (error) {
      if (alive.current && id === seq.current) setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, [path]);

  useEffect(() => {
    alive.current = true;
    setState((prev) => ({ ...prev, loading: true }));
    if (!enabled) return () => { alive.current = false; };
    load();
    const timer = interval
      ? setInterval(() => { if (document.visibilityState === 'visible') load(); }, interval)
      : null;
    return () => { alive.current = false; if (timer) clearInterval(timer); };
  }, [load, interval, enabled]);

  return { ...state, refresh: load };
}

/** Re-render every `ms` so relative timestamps stay fresh. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
