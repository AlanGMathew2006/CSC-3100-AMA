import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps
} from "react";
import "./App.css";
import { useAuth } from "./auth";
import { BrandHeader } from "./components/BrandHeader";
import { Toast } from "./components/Toast";
import type { AppTab } from "./components/BottomNav";
import { useProfile } from "./hooks/useProfile";
import { EmailConfirmedPage } from "./pages/auth/EmailConfirmedPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { isSupabaseConfigured } from "./lib/supabase";
import type { Recommendation } from "@csc-3100-ama/shared";
import { DashboardPage } from "./pages/app/DashboardPage";
import { MealDetailPage } from "./pages/app/MealDetailPage";
import { MenuPage } from "./pages/app/MenuPage";
import { OnboardingPage } from "./pages/app/OnboardingPage";
import { ProfilePage } from "./pages/app/ProfilePage";
import { RecommendationDetailPage } from "./pages/app/RecommendationDetailPage";
import { SavedMealsPage } from "./pages/app/SavedMealsPage";
import { WelcomePage } from "./pages/WelcomePage";

// The shared package doesn't export a MenuItem type, so
// derive it from the page component that consumes it.
type MenuItem = ComponentProps<typeof MealDetailPage>["item"];

type Screen = "welcome" | "login" | "signup";

// Only mounted while signed in, so the profile is fetched per session.
function SignedInApp() {
  const { profile, loading, error, reload } = useProfile();
  const [tab, setTab] = useState<AppTab>("home");
  const [returnTab, setReturnTab] = useState<AppTab>("home");
  const [selectedMeal, setSelectedMeal] =
    useState<MenuItem | null>(null);
  // A whole recommended meal from the dashboard; its items open in MealDetailPage on top of it.
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<Recommendation | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(
      () => setToastMessage(""),
      2600
    );
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const onToast = useCallback(
    (message: string) => setToastMessage(message),
    []
  );

  function navigate(nextTab: AppTab) {
    setSelectedMeal(null);
    setSelectedRecommendation(null);
    setTab(nextTab);
  }

  function openMeal(item: MenuItem) {
    setReturnTab(tab);
    setSelectedMeal(item);
    setTab("explore");
  }

  function closeMeal() {
    setSelectedMeal(null);
    setTab(returnTab);
  }

  if (loading) {
    return (
      <div className="page-shell">
        <BrandHeader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <BrandHeader />
        <section className="auth-content">
          <p className="field-helper error" role="alert">
            {error}{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => void reload()}>
              Retry
            </button>
          </p>
        </section>
      </div>
    );
  }

  if (!profile || !profile.onboarding_completed) {
    return <OnboardingPage onComplete={() => void reload()} />;
  }

  const page = selectedMeal ? (
    <MealDetailPage
      item={selectedMeal}
      onBack={closeMeal}
      onSelectMeal={setSelectedMeal}
      onNavigate={navigate}
      onToast={onToast}
    />
  ) : selectedRecommendation && tab === "home" ? (
    <RecommendationDetailPage
      rec={selectedRecommendation}
      onBack={() => setSelectedRecommendation(null)}
      onSelectMeal={openMeal}
      onNavigate={navigate}
      onToast={onToast}
    />
  ) : tab === "explore" ? (
    <MenuPage
      onNavigate={navigate}
      onSelectMeal={openMeal}
      onToast={onToast}
    />
  ) : tab === "saved" ? (
    <SavedMealsPage
      onNavigate={navigate}
      onSelectMeal={openMeal}
      onToast={onToast}
    />
  ) : tab === "profile" ? (
    <ProfilePage
      profile={profile}
      onNavigate={navigate}
      onProfileChanged={() => void reload()}
    />
  ) : (
    <DashboardPage
      onNavigate={navigate}
      onSelectMeal={openMeal}
      onSelectRecommendation={setSelectedRecommendation}
      onToast={onToast}
    />
  );

  return (
    <>
      {page}
      <Toast message={toastMessage} />
    </>
  );
}

function App() {
  const {
    session,
    loading,
    recovering,
    emailConfirmationPending,
    clearEmailConfirmation,
    cancelPasswordRecovery
  } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");

  if (!isSupabaseConfigured) {
    return (
      <div className="page-shell">
        <BrandHeader />
        <section className="auth-content">
          <p className="field-helper error" role="alert">
            Supabase isn't configured. Copy
            apps/web/.env.example to apps/web/.env.local and
            fill in your project URL and publishable key.
          </p>
        </section>
      </div>
    );
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

  if (loading) {
    return (
      <div className="page-shell">
        <BrandHeader />
      </div>
    );
  }

  if (recovering) {
    return (
      <ResetPasswordPage
        onBackToLogin={() => {
          cancelPasswordRecovery();
          setScreen("login");
        }}
      />
    );
  }

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
    return (
      <LoginPage onCreateAccount={() => setScreen("signup")} />
    );
  }

  return <SignupPage onLogin={() => setScreen("login")} />;
}

export default App;
