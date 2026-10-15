const PASSWORD_RESET_PATH = "/reset-password";

// Captured at startup, before the Supabase client consumes and clears the URL hash.
let pending =
  window.location.pathname === PASSWORD_RESET_PATH ||
  window.location.hash.includes("type=recovery");

export const PASSWORD_RESET_REDIRECT = `${window.location.origin}${PASSWORD_RESET_PATH}`;

export function isRecoveryLink(): boolean {
  return pending;
}

export function clearRecoveryLink(): void {
  pending = false;
  if (window.location.pathname === PASSWORD_RESET_PATH) {
    window.history.replaceState(null, "", `${window.location.origin}/`);
  }
}
