import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Button, ErrorText, Field, Screen, Title } from "../components/ui";
import { authErrorMessage, isInvalidCredentials } from "../lib/authErrors";
import { validateLogin, type LoginField } from "../lib/loginValidation";

export function LoginScreen({ onCreateAccount }: { onCreateAccount: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<LoginField | "both" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    setInvalidField(null);
    const issue = validateLogin(email, password);
    if (issue) {
      setInvalidField(issue.field);
      setError(issue.message);
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      if (isInvalidCredentials(err)) setInvalidField("both");
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const flagged = (field: LoginField) => invalidField === field || invalidField === "both";

  return (
    <Screen>
      <Title>Welcome back</Title>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        invalid={flagged("email")}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        invalid={flagged("password")}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={submitting ? "Logging in…" : "Log in"} onPress={() => void handleSubmit()} disabled={submitting} />
      <Button label="Create an account" variant="link" onPress={onCreateAccount} />
    </Screen>
  );
}
