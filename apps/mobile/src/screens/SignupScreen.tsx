import {
  PASSWORD_HINT,
  authErrorMessage,
  normalizeEmail,
  validateSignup,
  type SignupField,
} from "@csc-3100-ama/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { AuthPage, IntroBlock } from "../components/AuthLayout";
import { Field, FormMessage, LinkText, PrimaryButton } from "../components/FormFields";
import { Text } from "../components/Text";
import { useStyles } from "../theme";

// SignupPage on the web, without the Google button (phase 4). Opening the confirmation link
// from the phone is phase 4 too (deep links).
export function SignupScreen({ onLogin }: { onLogin: () => void }) {
  const styles = useStyles(makeStyles);
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

  if (confirmationSent) {
    return (
      <AuthPage>
        <IntroBlock title="Check your email to confirm your account">
          We sent a confirmation link to {normalizeEmail(email)}. Open it to finish creating your
          account, then log in.
        </IntroBlock>
        <View style={styles.actions}>
          <PrimaryButton label="Go to log in" onPress={onLogin} />
        </View>
      </AuthPage>
    );
  }

  return (
    <AuthPage gap={22}>
      <IntroBlock title="Create your account">Start making the most of your Dining Dollars.</IntroBlock>

      <View style={styles.stack}>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          invalid={errorField === "name"}
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          invalid={errorField === "email"}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          helper={PASSWORD_HINT}
          invalid={errorField === "password"}
        />
        <Field
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          invalid={errorField === "confirm"}
        />
        <FormMessage error={error} />
      </View>

      {/* On the web these two are buttons that go nowhere yet; the pages don't exist. */}
      <Text style={styles.terms}>
        By creating an account, you agree to our <LinkText label="Terms of use" /> and acknowledge
        our <LinkText label="Privacy policy" />.
      </Text>

      <View style={styles.actions}>
        <PrimaryButton
          label={submitting ? "Creating account…" : "Create account"}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        />
      </View>

      <Text style={styles.switchCopy}>
        Already have an account? <LinkText label="Log in" onPress={onLogin} />
      </Text>
    </AuthPage>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    stack: { gap: 16 },
    actions: { gap: 18 },
    terms: { fontSize: 12, lineHeight: 18, color: "#5d6865" },
    switchCopy: { fontSize: 13, lineHeight: 18, textAlign: "center", color: "#5d6865" },
  });
