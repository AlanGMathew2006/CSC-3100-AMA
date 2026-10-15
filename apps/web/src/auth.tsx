import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, requireSupabase } from "./lib/supabase";
import { CONFIRMATION_REDIRECT, isConfirmationPending } from "./lib/emailConfirmation";
import {
  clearRecoveryLink,
  isRecoveryLink,
  PASSWORD_RESET_REDIRECT,
} from "./lib/recoveryLink";
import { normalizeEmail } from "./lib/validation";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  // Resolves true when a session started, false when email confirmation is required.
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // True after the user opens a password reset email link.
  recovering: boolean;
  cancelPasswordRecovery: () => void;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recovering, setRecovering] = useState(isRecoveryLink);

  // The Supabase client restores and refreshes the session itself; we never
  // store tokens manually.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = requireSupabase();
    let active = true;

    client.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        if (isConfirmationPending() && data.session) {
          // The confirmation link signs the user in; drop that so they log in themselves.
          await client.auth.signOut({ scope: "local" });
          return;
        }
        setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data } = client.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (isConfirmationPending()) return;
      setSession(next);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
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
          options: {
            // Read by the handle_new_user trigger to fill profiles.display_name.
            data: { display_name: name.trim() },
            emailRedirectTo: CONFIRMATION_REDIRECT,
          },
        });
        if (error) throw error;
        return data.session !== null;
      },
      async signInWithGoogle() {
        const { error } = await requireSupabase().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
      },
      async resetPassword(email) {
        const { error } = await requireSupabase().auth.resetPasswordForEmail(
          normalizeEmail(email),
          { redirectTo: PASSWORD_RESET_REDIRECT },
        );
        if (error) throw error;
      },
      recovering,
      cancelPasswordRecovery() {
        clearRecoveryLink();
        setRecovering(false);
      },
      async updatePassword(password) {
        const { error } = await requireSupabase().auth.updateUser({ password });
        if (error) throw error;
        clearRecoveryLink();
        setRecovering(false);
      },
      async signOut() {
        const { error } = await requireSupabase().auth.signOut();
        if (error) throw error;
      },
    }),
    [session, loading, recovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
