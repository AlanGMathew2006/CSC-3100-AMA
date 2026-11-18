import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps
} from "react";
import "./App.css";
import { useAuth } from "./auth";
import { usePasswordRecovery } from "./passwordRecovery";
import { BrandHeader } from "./components/BrandHeader";
import { LoadingShell } from "./components/LoadingShell";
import { Toast } from "./components/Toast";
import type { AppTab } from "./components/BottomNav";
import { useProfile } from "./hooks/useProfile";
import { AuthScreens, type AuthScreen } from "./pages/auth/AuthScreens";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { isSupabaseConfigured } from "./lib/supabase";
import type { MenuCombo, Recommendation } from "@csc-3100-ama/shared";
import { ComboDetailPage } from "./pages/app/ComboDetailPage";
import { DashboardPage } from "./pages/app/DashboardPage";
import { MealDetailPage } from "./pages/app/MealDetailPage";
import { MenuPage } from "./pages/app/MenuPage";
import { OnboardingPage } from "./pages/app/OnboardingPage";
import { ProfilePage } from "./pages/app/ProfilePage";
import { RecommendationDetailPage } from "./pages/app/RecommendationDetailPage";
import { SavedMealsPage } from "./pages/app/SavedMealsPage";

// The shared package doesn't export a MenuItem type, so
// derive it from the page component that consumes it.
type MenuItem = ComponentProps<typeof MealDetailPage>["item"];

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
  // A combo opened from Explore's "Combos & Meals".
  const [selectedCombo, setSelectedCombo] = useState<MenuCombo | null>(null);
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
    setSelectedCombo(null);
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

  if (loading) return <LoadingShell />;

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
  ) : selectedCombo && tab === "explore" ? (
    <ComboDetailPage
      key={selectedCombo.id}
      combo={selectedCombo}
      onBack={() => setSelectedCombo(null)}
      onNavigate={navigate}
      onToast={onToast}
    />
  ) : tab === "explore" ? (
    <MenuPage
      onNavigate={navigate}
      onSelectMeal={openMeal}
      onSelectCombo={setSelectedCombo}
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
    emailConfirmationPending
  } = useAuth();
  const { recovering, cancelPasswordRecovery } = usePasswordRecovery();
  // The last auth screen the user was on, so AuthScreens can start there again
  // after a sign out or a password reset.
  const [authStart, setAuthStart] = useState<AuthScreen>("welcome");
  const authScreens = (
    <AuthScreens
      initialScreen={authStart}
      onScreenChange={setAuthStart}
    />
  );

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

  // The confirmation page comes before the loading check, as it always has.
  if (emailConfirmationPending) return authScreens;

  if (loading) return <LoadingShell />;

  if (recovering) {
    return (
      <ResetPasswordPage
        onBackToLogin={() => {
          cancelPasswordRecovery();
          setAuthStart("login");
        }}
      />
    );
  }

  return session ? <SignedInApp /> : authScreens;
}

export default App;
