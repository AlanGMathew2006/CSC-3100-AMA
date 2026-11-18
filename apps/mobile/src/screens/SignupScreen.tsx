import { PASSWORD_HINT, normalizeEmail, validateSignup, type SignupField } from "@csc-3100-ama/shared";
import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Body, Button, ErrorText, Field, Screen, Title } from "../components/ui";
import { authErrorMessage } from "../lib/authErrors";

export function SignupScreen({ onLogin }: { onLogin: () => void }) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<SignupField | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
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

  // Same message as the web app. Opening the link from the phone is phase 4 (deep links).
  if (confirmationSent) {
    return (
      <Screen>
        <Title>Check your email to confirm your account</Title>
        <Body>
          We sent a confirmation link to {normalizeEmail(email)}. Open it to finish creating your
          account, then log in.
        </Body>
        <Button label="Go to log in" onPress={onLogin} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Create your account</Title>
      <Field label="Name" value={name} onChangeText={setName} autoComplete="name" invalid={errorField === "name"} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        invalid={errorField === "email"}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        invalid={errorField === "password"}
      />
      <Body>{PASSWORD_HINT}</Body>
      <Field
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        invalid={errorField === "confirm"}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button
        label={submitting ? "Creating account…" : "Create account"}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      />
      <Button label="Log in" variant="link" onPress={onLogin} />
    </Screen>
  );
}
