import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth";
import { BrandHeader } from "../../components/BrandHeader";
import { Field, FormMessage } from "../../components/FormFields";
import { authErrorMessage } from "../../lib/authErrors";
import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from "../../lib/validation";

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<"password" | "confirm" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInvalidField(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setInvalidField("password");
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    if (password !== confirm) {
      setInvalidField("confirm");
      setError("Passwords don't match. Try again.");
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
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : "Save new password"}
          </button>
        </div>
      </form>
    </div>
  );
}
