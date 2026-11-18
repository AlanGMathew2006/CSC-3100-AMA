import { isValidEmail, normalizeEmail, type ValidationIssue } from "@csc-3100-ama/shared";

export type LoginField = "email" | "password";

// Returns the first problem found, or null when the form can be submitted.
// The server still decides whether the credentials are right.
export function validateLogin(email: string, password: string): ValidationIssue<LoginField> | null {
  if (!isValidEmail(normalizeEmail(email))) {
    return { field: "email", message: "Enter a valid email address." };
  }
  if (!password) return { field: "password", message: "Enter your password." };
  return null;
}
