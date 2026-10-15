interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

function asAuthError(error: unknown): AuthErrorLike {
  return typeof error === "object" && error !== null
    ? (error as AuthErrorLike)
    : {};
}

export function isInvalidCredentials(error: unknown): boolean {
  const { code, message } = asAuthError(error);
  return (
    code === "invalid_credentials" ||
    message?.toLowerCase().includes("invalid login credentials") === true
  );
}

// Maps Supabase auth errors to messages that are safe to show to users.
export function authErrorMessage(error: unknown): string {
  const { code, status } = asAuthError(error);

  switch (code) {
    case "invalid_credentials":
      return "Invalid email or password";
    case "email_not_confirmed":
      return "Confirm your email before logging in. Check your inbox.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Try logging in.";
    case "weak_password":
      return "That password is too weak. Try a longer passphrase.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    case "signup_disabled":
      return "Sign-ups are currently disabled.";
    case "provider_disabled":
      return "Google sign-in isn't available right now.";
    default:
      break;
  }

  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (error instanceof TypeError) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}
