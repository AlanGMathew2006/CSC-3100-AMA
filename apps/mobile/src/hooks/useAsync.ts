import { errorMessage } from "@csc-3100-ama/shared";
import { useCallback, useEffect, useRef, useState } from "react";

interface LoadState<T> {
  data: T | null;
  // True while a request is running (including reloads).
  loading: boolean;
  // True once a request has finished, successfully or not.
  loaded: boolean;
  error: string;
}

// Loads data on mount (and again on reload(), when `load` changes or when `refreshKey` changes),
// keeping the last result while it reloads. The same loading/error/data shape as the web hooks (useMenu,
// useRecommendations, ...). Pass a stable `load` (a module function or a useCallback).
export function useLoad<T>(load: () => Promise<T>, enabled = true, refreshKey = 0) {
  const [state, setState] = useState<LoadState<T>>({
    data: null,
    loading: enabled,
    loaded: false,
    error: "",
  });
  // Ignores a response that arrives after a newer request started (or after unmount).
  const latest = useRef(0);

  const run = useCallback(async () => {
    const id = ++latest.current;
    try {
      const data = await load();
      if (id === latest.current) setState({ data, loading: false, loaded: true, error: "" });
    } catch (err) {
      if (id === latest.current) {
        setState((current) => ({
          ...current,
          loading: false,
          loaded: true,
          error: errorMessage(err),
        }));
      }
    }
  }, [load]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    return run();
  }, [run]);

  useEffect(() => {
    if (enabled) void run();
    return () => {
      latest.current += 1;
    };
    // refreshKey is only here to run the request again when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, refreshKey]);

  return { ...state, reload };
}
