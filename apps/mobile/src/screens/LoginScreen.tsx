import { authErrorMessage, isInvalidCredentials } from "@csc-3100-ama/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { AuthPage, IntroBlock } from "../components/AuthLayout";
import { Field, FormMessage, LinkText, PrimaryButton } from "../components/FormFields";
import { Text } from "../components/Text";
import { validateLogin, type LoginField } from "../lib/loginValidation";
import { useStyles } from "../theme";

// LoginPage on the web, without the Google button and "Forgot password?" (both need the
// deep-link work planned for phase 4).
export function LoginScreen({ onCreateAccount }: { onCreateAccount: () => void }) {
  const styles = useStyles(makeStyles);
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
    <AuthPage>
      <IntroBlock title="Welcome back">Log in to continue planning meals that fit your goals.</IntroBlock>

      <View style={styles.stack}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          invalid={flagged("email")}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="current-password"
          textContentType="password"
          invalid={flagged("password")}
        />
        <FormMessage error={error} />
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={submitting ? "Logging in…" : "Log in"}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        />
      </View>

      <Text style={styles.switchCopy}>
        New to PolyProvision? <LinkText label="Create an account" onPress={onCreateAccount} />
      </Text>
    </AuthPage>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    stack: { gap: 18 },
    actions: { gap: 18 },
    switchCopy: { fontSize: 13, lineHeight: 18, textAlign: "center", color: "#5d6865" },
  });
