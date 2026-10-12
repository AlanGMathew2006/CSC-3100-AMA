import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth";
import { BrandHeader } from "../../components/BrandHeader";
import { Field, FormMessage } from "../../components/FormFields";
import { GoogleButton } from "../../components/GoogleButton";
import { useGoogleSignIn } from "../../hooks/useGoogleSignIn";
import { authErrorMessage } from "../../lib/authErrors";
import {
  PASSWORD_HINT,
  normalizeEmail,
  validateSignup,
  type SignupField,
} from "../../lib/validation";

type SignupPageProps = {
  onLogin: () => void;
};

export function SignupPage({ onLogin }: SignupPageProps) {
  const { signUp } = useAuth();
  const google = useGoogleSignIn();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<SignupField | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setErrorField(null);

    const issue = validateSignup({ name, email, password, confirm });
    if (issue) {
      setError(issue.message);
      setErrorField(issue.field);
      return;
    }

    setSubmitting(true);
    try {
      const signedIn = await signUp(name, email, password);
      if (!signedIn) {
        setPassword("");
        setConfirm("");
        setConfirmationSent(true);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmationSent) {
    return (
      <div className="page-shell">
        <BrandHeader />

        <section className="auth-content">
          <div className="intro-block">
            <h1>Check your email to confirm your account</h1>
            <p>
              We sent a confirmation link to {normalizeEmail(email)}. Open it
              to finish creating your account, then log in.
            </p>
          </div>

          <div className="auth-actions">
            <button type="button" className="primary-button" onClick={onLogin}>
              Go to log in
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <BrandHeader />

      <form
        className="auth-content auth-content--signup"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="intro-block">
          <h1>Create your account</h1>
          <p>Start making the most of your Dining Dollars.</p>
        </div>

        <div className="form-stack form-stack--signup">
          <Field
            label="Name"
            value={name}
            onChange={setName}
            autoComplete="name"
            invalid={errorField === "name"}
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            invalid={errorField === "email"}
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            helper={PASSWORD_HINT}
            invalid={errorField === "password"}
          />
          <Field
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            invalid={errorField === "confirm"}
          />
          <FormMessage error={error || google.error} />
        </div>

        <p className="terms-text">
          By creating an account, you agree to our{" "}
          <button type="button" className="link-button">Terms of use</button> and
          acknowledge our{" "}
          <button type="button" className="link-button">Privacy policy</button>.
        </p>

        <div className="auth-actions">
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>

          <div className="divider-row" aria-label="Continue with Google">
            <span>or</span>
          </div>

          <GoogleButton onClick={() => void google.start()} loading={google.loading} />
        </div>

        <p className="signup-copy">
          Already have an account?{" "}
          <button type="button" className="link-button" onClick={onLogin}>
            Log in
          </button>
        </p>
      </form>
    </div>
  );
}
