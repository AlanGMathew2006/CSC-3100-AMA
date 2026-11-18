import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { Body, LoadingScreen, Screen } from "./src/components/ui";
import { MISSING_CONFIG_MESSAGE, supabaseConfig } from "./src/config";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SignupScreen } from "./src/screens/SignupScreen";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";

type AuthScreen = "welcome" | "login" | "signup";

function AuthFlow() {
  const [screen, setScreen] = useState<AuthScreen>("welcome");
  if (screen === "login") return <LoginScreen onCreateAccount={() => setScreen("signup")} />;
  if (screen === "signup") return <SignupScreen onLogin={() => setScreen("login")} />;
  return <WelcomeScreen onGetStarted={() => setScreen("signup")} onSignIn={() => setScreen("login")} />;
}

function Root() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return session ? <HomeScreen /> : <AuthFlow />;
}

export default function App() {
  if (!supabaseConfig) {
    return (
      <Screen>
        <Body>{MISSING_CONFIG_MESSAGE}</Body>
      </Screen>
    );
  }
  return (
    <AuthProvider>
      <Root />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
