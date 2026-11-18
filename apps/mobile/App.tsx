import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthPage } from "./src/components/AuthLayout";
import { Helper } from "./src/components/FormFields";
import { LoadingPage } from "./src/components/LoadingPage";
import { MISSING_CONFIG_MESSAGE, supabaseConfig } from "./src/config";
import { SignedInApp } from "./src/SignedInApp";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SignupScreen } from "./src/screens/SignupScreen";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { ThemeProvider, fontAssets, useTheme } from "./src/theme";

type AuthScreen = "welcome" | "login" | "signup";

function AuthFlow() {
  const [screen, setScreen] = useState<AuthScreen>("welcome");
  if (screen === "login") return <LoginScreen onCreateAccount={() => setScreen("signup")} />;
  if (screen === "signup") return <SignupScreen onLogin={() => setScreen("login")} />;
  return <WelcomeScreen onGetStarted={() => setScreen("signup")} onSignIn={() => setScreen("login")} />;
}

function Root() {
  const { session, loading } = useAuth();
  const { setMode } = useTheme();
  // Signed-out screens are always light; a signed-in user's saved theme is applied once loaded.
  useEffect(() => {
    if (!session) setMode("light");
  }, [session, setMode]);
  if (loading) return <LoadingPage />;
  return session ? <SignedInApp /> : <AuthFlow />;
}

function Status() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // Wait for the fonts (they are bundled, so this is quick); fall back to system fonts on error.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {supabaseConfig ? (
          <AuthProvider>
            <Root />
          </AuthProvider>
        ) : (
          <AuthPage>
            <Helper tone="error">{MISSING_CONFIG_MESSAGE}</Helper>
          </AuthPage>
        )}
        <Status />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
