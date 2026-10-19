import { useCallback, useEffect, useState } from "react";
import type { MenuResponse } from "@csc-3100-ama/shared";
import { fetchMenu } from "../lib/api";
import { errorMessage } from "../lib/errors";

export function useMenu() {
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setMenu(await fetchMenu());
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { menu, loading, error, reload };
}
