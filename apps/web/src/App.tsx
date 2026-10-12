import { useState } from "react";
import "./App.css";
import { useAuth } from "./auth";
import { BrandHeader } from "./components/BrandHeader";
import { isSupabaseConfigured } from "./lib/supabase";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { WelcomePage } from "./pages/WelcomePage";

type Screen = "welcome" | "login" | "signup";

function App() {
  const { session, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");

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

  if (loading) {
    return (
      <div className="page-shell">
        <BrandHeader />
      </div>
    );
  }

  if (session) return <DashboardPage />;

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
