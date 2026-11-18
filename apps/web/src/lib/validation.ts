// The password and sign-up rules live in packages/shared so the web and mobile
// apps use the same ones. This file keeps the old import path working.
export {
  MIN_PASSWORD_LENGTH,
  PASSWORD_HINT,
  isValidEmail,
  normalizeEmail,
  validateNewPassword,
  validateSignup,
} from "@csc-3100-ama/shared";
export type {
  PasswordField,
  SignupField,
  SignupInput,
  ValidationIssue,
} from "@csc-3100-ama/shared";
