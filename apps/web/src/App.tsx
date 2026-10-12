import { useState } from "react";
import "./App.css";
import { useAuth } from "./auth";
import { BrandHeader } from "./components/BrandHeader";
import { useProfile } from "./hooks/useProfile";
import { clearConfirmation, isConfirmationPending } from "./lib/emailConfirmation";
import { EmailConfirmedPage } from "./pages/auth/EmailConfirmedPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { isSupabaseConfigured } from "./lib/supabase";
import { DashboardPage } from "./pages/app/DashboardPage";
import { OnboardingPage } from "./pages/app/OnboardingPage";
import { WelcomePage } from "./pages/WelcomePage";

type Screen = "welcome" | "login" | "signup";

// Only mounted while signed in, so the profile is fetched per session.
function SignedInApp() {
  const { profile, loading, error, reload } = useProfile();

  if (loading) {
    return (
      <div className="page-shell">
        <BrandHeader />
      </div>
    );
  }

  // A missing profile row (error or none) falls through to the dashboard,
  // which shows its own error/retry state.
  if (!error && profile && !profile.onboarding_completed) {
    return <OnboardingPage onComplete={() => void reload()} />;
  }

  return <DashboardPage />;
}

function App() {
  const { session, loading, recovering } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [confirmed, setConfirmed] = useState(isConfirmationPending);

  if (!isSupabaseConfigured) {
    return (
      <div className="page-shell">
        <BrandHeader />
        <section className="auth-content">
          <p className="field-helper error" role="alert">
            Supabase isn't configured. Copy apps/web/.env.example to
            apps/web/.env.local and fill in your project URL and publishable
            key.
          </p>
        </section>
      </div>
    );
  }

  if (confirmed) {
    return (
      <EmailConfirmedPage
        onContinue={() => {
          clearConfirmation();
          setConfirmed(false);
          setScreen("login");
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="page-shell">
        <BrandHeader />
      </div>
    );
  }

  if (session && recovering) return <ResetPasswordPage />;

  if (session) return <SignedInApp />;

  if (screen === "welcome") {
    return (
      <WelcomePage
        onGetStarted={() => setScreen("signup")}
        onSignIn={() => setScreen("login")}
      />
    );
  }

  if (screen === "login") {
    return <LoginPage onCreateAccount={() => setScreen("signup")} />;
  }

  return <SignupPage onLogin={() => setScreen("login")} />;
}

export default App;
