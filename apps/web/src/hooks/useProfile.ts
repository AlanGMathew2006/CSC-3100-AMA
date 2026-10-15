import { useCallback, useEffect, useState } from "react";
import { fetchProfile } from "../lib/api";
import { errorMessage } from "../lib/errors";
import type { Profile } from "../types/dashboard";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setProfile(await fetchProfile());
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

  return { profile, loading, error, reload };
}
