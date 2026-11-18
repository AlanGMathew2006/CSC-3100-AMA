import type { Profile, Recommendation, RecommendationsResponse } from "@csc-3100-ama/shared";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { Body, Button, ErrorText, LoadingScreen, Screen, Title } from "../components/ui";
import { api } from "../lib/api";
import { formatAmount, formatPrice } from "../lib/format";
import { light as colors } from "../theme";

const RECOMMENDATION_COUNT = 3;

const EMPTY_REASONS: Record<string, string> = {
  over_daily_budget: "You've reached today's spending target, so there are no recommendations right now.",
  no_eligible_locations: "No dining locations are open right now.",
  no_feasible_meals: "No meals fit your goals and filters right now.",
};

interface HomeData {
  profile: Profile | null;
  recommendations: RecommendationsResponse;
}

// Phase 1 smoke screen: proves sign in, the API client and the backend work together.
// The real screens come in phase 2.
export function HomeScreen() {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signOutError, setSignOutError] = useState("");

  // Bumped by Retry to load again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([api.fetchProfile(), api.fetchRecommendations({ limit: RECOMMENDATION_COUNT })])
      .then(([profile, recommendations]) => {
        if (!active) return;
        setData({ profile, recommendations });
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setLoading(true);
    setError("");
    setAttempt((count) => count + 1);
  }

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
    } catch {
      setSignOutError("Couldn't sign out. Try again.");
    }
  }

  if (loading) return <LoadingScreen />;

  const recommendations = data?.recommendations.recommendations.slice(0, RECOMMENDATION_COUNT) ?? [];

  return (
    <Screen>
      <Title>Signed in as {user?.email ?? "unknown"}</Title>

      {error ? (
        <>
          <ErrorText>{error}</ErrorText>
          <Button label="Retry" onPress={retry} />
        </>
      ) : data ? (
        <>
          <Body>
            Onboarding: {data.profile?.onboarding_completed ? "done" : "not done yet (finish it on the web app)"}
          </Body>
          <Text style={styles.heading}>Recommendations</Text>
          {recommendations.length === 0 ? (
            <Body>
              {(data.recommendations.reason && EMPTY_REASONS[data.recommendations.reason]) ||
                "No recommendations right now."}
            </Body>
          ) : (
            recommendations.map((rec, index) => (
              <RecommendationRow key={`${rec.location.id}-${index}`} rec={rec} />
            ))
          )}
        </>
      ) : null}

      {signOutError ? <ErrorText>{signOutError}</ErrorText> : null}
      <Button label="Sign out" variant="link" onPress={() => void handleSignOut()} />
    </Screen>
  );
}

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const name = rec.combo?.name ?? rec.items.map((item) => item.name).join(", ");
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{name}</Text>
      <Text style={styles.cardLocation}>{rec.location.name}</Text>
      <Text style={styles.cardNumbers}>
        {formatPrice(rec.total_price)} · {formatAmount(rec.nutrition.calories, " cal")} ·{" "}
        {formatAmount(rec.nutrition.protein_g, "g protein")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: "700", color: colors.text },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  cardLocation: { fontSize: 14, color: colors.muted },
  cardNumbers: { fontSize: 14, color: colors.text },
});
