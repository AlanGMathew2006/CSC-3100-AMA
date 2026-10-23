const MARKER = "confirmed";

export function isEmailConfirmationLink(search: string): boolean {
  return new URLSearchParams(search).get(MARKER) === "1";
}

export function getConfirmationRedirect(origin: string): string {
  return `${origin}/?${MARKER}=1`;
}
