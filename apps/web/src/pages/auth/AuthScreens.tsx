import { useState } from "react";
import { useAuth } from "../../auth";
import { WelcomePage } from "../WelcomePage";
import { EmailConfirmedPage } from "./EmailConfirmedPage";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";

export type AuthScreen = "welcome" | "login" | "signup";

type AuthScreensProps = {
  // Where to start. App passes the screen the user was last on, so signing out
  // or leaving a password reset returns to it.
  initialScreen?: AuthScreen;
  onScreenChange?: (screen: AuthScreen) => void;
};

// Everything a signed-out user sees: welcome, log in, sign up, and the page
// after an email confirmation link. It owns which of them is showing.
export function AuthScreens({
  initialScreen = "welcome",
  onScreenChange
}: AuthScreensProps) {
  const { emailConfirmationPending, clearEmailConfirmation } = useAuth();
  const [screen, setScreenState] = useState<AuthScreen>(initialScreen);

  function setScreen(next: AuthScreen) {
    setScreenState(next);
    onScreenChange?.(next);
  }

  if (emailConfirmationPending) {
    return (
      <EmailConfirmedPage
        onContinue={() => {
          window.history.replaceState(
            null,
            "",
            window.location.pathname
          );
          clearEmailConfirmation();
          setScreen("login");
        }}
      />
    );
  }

  if (screen === "welcome") {
    return (
      <WelcomePage
        onGetStarted={() => setScreen("signup")}
        onSignIn={() => setScreen("login")}
      />
    );
  }

  if (screen === "login") {
    return (
      <LoginPage onCreateAccount={() => setScreen("signup")} />
    );
  }

  return <SignupPage onLogin={() => setScreen("login")} />;
}
