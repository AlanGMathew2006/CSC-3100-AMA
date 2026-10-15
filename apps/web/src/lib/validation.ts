export const MIN_PASSWORD_LENGTH = 12;

export const PASSWORD_HINT =
  "Use at least 12 characters. A long passphrase is recommended.";

export type SignupField = "name" | "email" | "password" | "confirm";

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export interface ValidationIssue {
  field: SignupField;
  message: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

// Returns the first problem found, or null when the input is valid.
export function validateSignup(input: SignupInput): ValidationIssue | null {
  if (!input.name.trim()) {
    return { field: "name", message: "Enter your name." };
  }
  if (!isValidEmail(normalizeEmail(input.email))) {
    return { field: "email", message: "Enter a valid email address." };
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      field: "password",
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
    };
  }
  if (input.password !== input.confirm) {
    return { field: "confirm", message: "Passwords don't match. Try again." };
  }
  return null;
}
