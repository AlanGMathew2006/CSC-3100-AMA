import type { Session, User } from "@supabase/supabase-js";
import { normalizeEmail } from "@csc-3100-ama/shared";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { requireSupabase, supabase, watchAppStateForTokenRefresh } from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  // Resolves true when a session started, false when email confirmation is required.
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabase !== null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    const stopWatching = watchAppStateForTokenRefresh();
    return () => {
      active = false;
      data.subscription.unsubscribe();
      stopWatching();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      async signIn(email, password) {
        const { error } = await requireSupabase().auth.signInWithPassword({
          email: normalizeEmail(email),
          password,
        });
        if (error) throw error;
      },
      async signUp(name, email, password) {
        const { data, error } = await requireSupabase().auth.signUp({
          email: normalizeEmail(email),
          password,
          // Used to fill profiles.display_name when onboarding is completed.
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        return data.session !== null;
      },
      async signOut() {
        const { error } = await requireSupabase().auth.signOut();
        if (error) throw error;
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
