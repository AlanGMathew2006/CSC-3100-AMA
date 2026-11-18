import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { isSupabaseConfigured, requireSupabase } from "./lib/supabase";
import { unwrap } from "./lib/supabaseResult";
import {
  isRecoveryLink,
  PASSWORD_RESET_PATH
} from "./lib/recoveryLink";

interface PasswordRecoveryValue {
  // True after the user opens a password reset email link.
  recovering: boolean;
  cancelPasswordRecovery: () => void;
  updatePassword: (password: string) => Promise<void>;
}

const PasswordRecoveryContext =
  createContext<PasswordRecoveryValue | null>(null);

// Owns the "user opened a password reset link" state. It listens to Supabase
// for the PASSWORD_RECOVERY event itself, so AuthProvider only deals with the
// session. It needs no other provider; mount it above anything
// that calls usePasswordRecovery().
export function PasswordRecoveryProvider({
  children
}: {
  children: ReactNode;
}) {
  const [recovering, setRecovering] = useState(() =>
    isRecoveryLink(window.location.pathname, window.location.hash)
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = requireSupabase().auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") setRecovering(true);
      }
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<PasswordRecoveryValue>(
    () => ({
      recovering,
      cancelPasswordRecovery() {
        clearRecoveryUrl();
        setRecovering(false);
      },
      async updatePassword(password) {
        unwrap(await requireSupabase().auth.updateUser({ password }));
        clearRecoveryUrl();
        setRecovering(false);
      }
    }),
    [recovering]
  );

  return (
    <PasswordRecoveryContext.Provider value={value}>
      {children}
    </PasswordRecoveryContext.Provider>
  );
}

function clearRecoveryUrl(): void {
  if (window.location.pathname === PASSWORD_RESET_PATH) {
    window.history.replaceState(null, "", `${window.location.origin}/`);
  }
}

export function usePasswordRecovery(): PasswordRecoveryValue {
  const context = useContext(PasswordRecoveryContext);
  if (!context)
    throw new Error(
      "usePasswordRecovery must be used inside PasswordRecoveryProvider"
    );
  return context;
}
