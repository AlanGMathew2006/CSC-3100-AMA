import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { BrandHeader } from "../components/BrandHeader";
import { Field, FormMessage } from "../components/FormFields";
import { errorMessage } from "../lib/errors";

type LoginPageProps = {
  onCreateAccount: () => void;
};

export function LoginPage({ onCreateAccount }: LoginPageProps) {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Enter your email above, then choose Forgot password.");
      return;
    }
    try {
      await resetPassword(email.trim());
      setNotice("Check your email for a password reset link.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="page-shell">
      <BrandHeader />

      <form className="auth-content" onSubmit={handleSubmit}>
        <div className="intro-block">
          <h1>Welcome back</h1>
          <p>Log in to continue planning meals that fit your goals.</p>
        </div>

        <div className="form-stack">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={Boolean(error)}
          />
          <FormMessage error={error} notice={notice} />

          <button
            type="button"
            className="link-button link-button--right"
            onClick={handleForgotPassword}
          >
            Forgot password?
          </button>
        </div>

        <div className="auth-actions">
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>

          <div className="divider-row" aria-label="Continue with Google">
            <span>or</span>
          </div>

          <button type="button" className="secondary-button" onClick={handleGoogle}>
            <span className="google-mark">G</span>
            Continue with Google
          </button>
        </div>

        <p className="signup-copy">
          New to PolyProvision?{" "}
          <button type="button" className="link-button" onClick={onCreateAccount}>
            Create an account
          </button>
        </p>
      </form>
    </div>
  );
}
