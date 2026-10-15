const MARKER = "confirmed";

let pending =
  new URLSearchParams(window.location.search).get(MARKER) === "1";

export const CONFIRMATION_REDIRECT = `${window.location.origin}/?${MARKER}=1`;

// True while the user arrived from a confirmation email link and hasn't continued yet.
export function isConfirmationPending(): boolean {
  return pending;
}

export function clearConfirmation(): void {
  pending = false;
  window.history.replaceState(null, "", window.location.pathname);
}
