export const MIN_PASSWORD_LENGTH = 12;

export const PASSWORD_HINT =
  "Use at least 12 characters. A long passphrase is recommended.";

export type PasswordField = "password" | "confirm";

export type SignupField = "name" | "email" | PasswordField;

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export interface ValidationIssue<Field extends string = SignupField> {
  field: Field;
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
  return validateNewPassword(input.password, input.confirm);
}

// Password rules shared by sign up and password reset.
// Returns the first problem found, or null when the password is valid.
export function validateNewPassword(
  password: string,
  confirm: string,
): ValidationIssue<PasswordField> | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      field: "password",
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
    };
  }
  if (password !== confirm) {
    return { field: "confirm", message: "Passwords don't match. Try again." };
  }
  return null;
}
