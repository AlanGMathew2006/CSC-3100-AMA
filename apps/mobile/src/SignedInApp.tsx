import { useAuth } from "./auth/AuthProvider";
import { AuthPage } from "./components/AuthLayout";
import { Helper, LinkText } from "./components/FormFields";
import { LoadingPage } from "./components/LoadingPage";
import { useLoad } from "./hooks/useAsync";
import { api } from "./lib/api";
import { MainTabs } from "./navigation/MainTabs";
import { OnboardingScreen } from "./screens/OnboardingScreen";

// Only mounted while signed in, so the profile is fetched per session (SignedInApp on the web).
// Without a finished onboarding the user sets their plan first.
export function SignedInApp() {
  const { user } = useAuth();
  const profile = useLoad(api.fetchProfile);

  if (!profile.loaded && !profile.error) return <LoadingPage />;

  if (profile.error) {
    return (
      <AuthPage top={0}>
        <Helper tone="error">
          {profile.error} <LinkText label="Retry" onPress={() => void profile.reload()} />
        </Helper>
      </AuthPage>
    );
  }

  if (!profile.data?.onboarding_completed) {
    return <OnboardingScreen key={user?.id} onComplete={() => void profile.reload()} />;
  }

  return <MainTabs profile={profile.data} onProfileChanged={() => void profile.reload()} />;
}
