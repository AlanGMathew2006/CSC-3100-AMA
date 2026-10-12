// Captured at startup, before the Supabase client consumes and clears the URL hash.
let pending = window.location.hash.includes("type=recovery");

export function isRecoveryLink(): boolean {
  return pending;
}

export function clearRecoveryLink(): void {
  pending = false;
}
