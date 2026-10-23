export const PASSWORD_RESET_PATH = "/reset-password";

export function isRecoveryLink(
  pathname: string,
  hash: string
): boolean {
  return (
    pathname === PASSWORD_RESET_PATH ||
    hash.includes("type=recovery")
  );
}

export function getPasswordResetRedirect(origin: string): string {
  return `${origin}${PASSWORD_RESET_PATH}`;
}
