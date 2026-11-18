import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  requireSupabase
} from "./lib/supabase";
import {
  getConfirmationRedirect,
  isEmailConfirmationLink
} from "./lib/emailConfirmation";
import { getPasswordResetRedirect } from "./lib/recoveryLink";
import { unwrap } from "./lib/supabaseResult";
import { normalizeEmail } from "./lib/validation";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  // Resolves true when a session started, false when email confirmation is required.
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  emailConfirmationPending: boolean;
  clearEmailConfirmation: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(
  null
);

export function AuthProvider({
  children
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [emailConfirmationPending, setEmailConfirmationPending] =
    useState(() => isEmailConfirmationLink(window.location.search));

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
        if (emailConfirmationPending && data.session) {
          // The confirmation link signs the user in; drop that so they log in themselves.
          await client.auth.signOut({ scope: "local" });
          return;
        }
        setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data } = client.auth.onAuthStateChange(
      (_event, next) => {
        if (emailConfirmationPending) return;
        setSession(next);
      }
    );
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [emailConfirmationPending]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      async signIn(email, password) {
        unwrap(
          await requireSupabase().auth.signInWithPassword({
            email: normalizeEmail(email),
            password
          })
        );
      },
      async signUp(name, email, password) {
        const data = unwrap(
          await requireSupabase().auth.signUp({
            email: normalizeEmail(email),
            password,
            options: {
              // Used to fill profiles.display_name when onboarding is completed.
              data: { display_name: name.trim() },
              emailRedirectTo: getConfirmationRedirect(
                window.location.origin
              )
            }
          })
        );
        return data.session !== null;
      },
      async signInWithGoogle() {
        unwrap(
          await requireSupabase().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin }
          })
        );
      },
      async resetPassword(email) {
        unwrap(
          await requireSupabase().auth.resetPasswordForEmail(
            normalizeEmail(email),
            {
              redirectTo: getPasswordResetRedirect(
                window.location.origin
              )
            }
          )
        );
      },
      emailConfirmationPending,
      clearEmailConfirmation() {
        setEmailConfirmationPending(false);
      },
      async signOut() {
        unwrap(await requireSupabase().auth.signOut());
      }
    }),
    [session, loading, emailConfirmationPending]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
