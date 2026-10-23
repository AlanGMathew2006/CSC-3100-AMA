import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth";
import { BrandHeader } from "../../components/BrandHeader";
import { Field, FormMessage } from "../../components/FormFields";
import { authErrorMessage } from "../../lib/authErrors";
import {
  PASSWORD_HINT,
  validateNewPassword,
  type PasswordField,
} from "../../lib/validation";

type ResetPasswordPageProps = {
  onBackToLogin: () => void;
};

export function ResetPasswordPage({ onBackToLogin }: ResetPasswordPageProps) {
  const { session, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<PasswordField | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInvalidField(null);

    const issue = validateNewPassword(password, confirm);
    if (issue) {
      setInvalidField(issue.field);
      setError(issue.message);
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <BrandHeader />

      {!session ? (
        <section className="auth-content">
          <div className="intro-block">
            <h1>Reset link expired</h1>
            <p>
              This password reset link is invalid or has expired. Request a new
              link and open it again.
            </p>
          </div>
          <div className="auth-actions">
            <button
              type="button"
              className="primary-button"
              onClick={onBackToLogin}
            >
              Back to log in
            </button>
          </div>
        </section>
      ) : (
        <form className="auth-content" onSubmit={handleSubmit} noValidate>
          <div className="intro-block">
            <h1>Choose a new password</h1>
            <p>Enter a new password for your account.</p>
          </div>

          <div className="form-stack">
            <Field
              label="New password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              helper={PASSWORD_HINT}
              invalid={invalidField === "password"}
            />
            <Field
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              invalid={invalidField === "confirm"}
            />
            <FormMessage error={error} />
          </div>

          <div className="auth-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save new password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
