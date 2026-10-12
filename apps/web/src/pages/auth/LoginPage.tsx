import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth";
import { BrandHeader } from "../../components/BrandHeader";
import { Field, FormMessage } from "../../components/FormFields";
import { GoogleButton } from "../../components/GoogleButton";
import { useGoogleSignIn } from "../../hooks/useGoogleSignIn";
import { authErrorMessage, isInvalidCredentials } from "../../lib/authErrors";
import { isValidEmail, normalizeEmail } from "../../lib/validation";

type LoginPageProps = {
  onCreateAccount: () => void;
};

export function LoginPage({ onCreateAccount }: LoginPageProps) {
  const { signIn, resetPassword } = useAuth();
  const google = useGoogleSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [credentialsInvalid, setCredentialsInvalid] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setCredentialsInvalid(false);
    setNotice("");
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setCredentialsInvalid(isInvalidCredentials(err));
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setCredentialsInvalid(false);
    setNotice("");
    if (!isValidEmail(normalizeEmail(email))) {
      setError("Enter your email above, then choose Forgot password.");
      return;
    }
    try {
      await resetPassword(email);
      setNotice("Check your email for a password reset link.");
    } catch (err) {
      setError(authErrorMessage(err));
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
            invalid={credentialsInvalid}
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={credentialsInvalid}
          />
          <FormMessage error={error || google.error} notice={notice} />

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

          <GoogleButton onClick={() => void google.start()} loading={google.loading} />
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
