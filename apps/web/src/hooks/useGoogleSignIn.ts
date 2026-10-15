import { useState } from "react";
import { useAuth } from "../auth";
import { authErrorMessage } from "../lib/authErrors";

export function useGoogleSignIn() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setError("");
    setLoading(true);
    try {
      // On success the browser leaves for Google, so loading stays on.
      await signInWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  }

  return { start, loading, error };
}
