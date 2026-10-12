import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { BrandHeader } from "../components/BrandHeader";
import { Field, FormMessage } from "../components/FormFields";
import { errorMessage } from "../lib/errors";

type SignupPageProps = {
  onLogin: () => void;
};

export function SignupPage({ onLogin }: SignupPageProps) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (password.length < 8) {
      setError("Use 8 or more characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match. Try again.");
      return;
    }
    setSubmitting(true);
    try {
      const signedIn = await signUp(name.trim(), email.trim(), password);
      if (!signedIn) {
        setNotice("Check your email to confirm your account, then log in.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <BrandHeader />

      <form className="auth-content auth-content--signup" onSubmit={handleSubmit}>
        <div className="intro-block">
          <h1>Create your account</h1>
          <p>Start making the most of your Dining Dollars.</p>
        </div>

        <div className="form-stack form-stack--signup">
          <Field label="Name" value={name} onChange={setName} autoComplete="name" />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            helper="Use your Cal Poly email address."
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            helper="Use 8 or more characters."
          />
          <Field
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            invalid={Boolean(confirm) && confirm !== password}
          />
          <FormMessage error={error} notice={notice} />
        </div>

        <p className="terms-text">
          By creating an account, you agree to our{" "}
          <button type="button" className="link-button">Terms of use</button> and
          acknowledge our{" "}
          <button type="button" className="link-button">Privacy policy</button>.
        </p>

        <div className="auth-actions auth-actions--signup">
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
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
