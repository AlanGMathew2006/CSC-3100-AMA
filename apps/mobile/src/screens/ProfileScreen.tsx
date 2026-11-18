import {
  DIETARY_OPTIONS,
  EMPTY_PREFERENCES,
  HALAL_FRIENDLY_NOTE,
  NUTRITION_PRIORITIES,
  displayName,
  errorMessage,
  validateProfileMoney,
  type Profile,
  type UserPreferences,
} from "@csc-3100-ama/shared";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Switch, View } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { AvoidancePicker } from "../components/AvoidancePicker";
import { ChoiceChip, ChoiceGroup, ChoiceList } from "../components/Choice";
import { Helper, PrimaryButton } from "../components/FormFields";
import { Icon } from "../components/Icon";
import { Page } from "../components/Page";
import { PageTitle, tabContent } from "../components/PageTitle";
import { Text, TextInput } from "../components/Text";
import { useLoad } from "../hooks/useAsync";
import { api } from "../lib/api";
import { radii, useStyles, useTheme, type Palette } from "../theme";

type ChoiceKey = "nutrition_priorities" | "dietary_restrictions";

// The Profile tab: ProfilePage on the web. It edits the Dining Dollars balance and daily target
// (PATCH /api/profile) and the preferences the recommendations use (PUT /api/preferences:
// priorities, dietary choices, allergens, avoided foods, budget alerts, theme), plus Log out.
export function ProfileScreen({
  profile,
  onProfileChanged,
}: {
  profile: Profile;
  onProfileChanged: () => void;
}) {
  const styles = useStyles(makeStyles);
  const { palette, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const saved = useLoad(api.fetchPreferences);
  // The form's edits; until the first edit it shows what was loaded.
  const [edits, setEdits] = useState<UserPreferences | null>(null);
  const [balance, setBalance] = useState(String(profile.dining_dollars_balance));
  const [target, setTarget] = useState(String(profile.daily_spending_target ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoutError, setLogoutError] = useState("");

  const preferences: UserPreferences = edits ?? { ...EMPTY_PREFERENCES, ...saved.data };
  const preferencesLoaded = saved.loaded && !saved.error;
  const theme = preferences.theme;

  // The theme changes as soon as it is picked, before saving (as on the web).
  useEffect(() => {
    if (preferencesLoaded) setMode(theme);
  }, [theme, preferencesLoaded, setMode]);

  const update = (changes: Partial<UserPreferences>) =>
    setEdits({ ...preferences, ...changes });

  const toggleChoice = (key: ChoiceKey, value: string) =>
    update({
      [key]: preferences[key].includes(value)
        ? preferences[key].filter((entry) => entry !== value)
        : [...preferences[key], value],
    });

  async function handleSave() {
    setError("");
    setNotice("");
    const moneyError = validateProfileMoney(balance, target);
    if (moneyError) {
      setError(moneyError);
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        api.updateProfile({
          dining_dollars_balance: Number(balance),
          daily_spending_target: Number(target),
        }),
        api.updatePreferences(preferences),
      ]);
      setNotice("Preferences saved.");
      onProfileChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setLogoutError("");
    try {
      await signOut();
    } catch (err) {
      setLogoutError(errorMessage(err));
    }
  }

  const name = displayName(profile, user);
  const shownError = error || saved.error;

  return (
    <Page tabs contentStyle={tabContent}>
      <PageTitle>Preferences</PageTitle>
      <View style={styles.summary}>
        <Image
          source={require("../../assets/images/profile-avatar.jpg")}
          style={styles.avatar}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryName}>{name}</Text>
          <Text style={styles.summaryPlan}>Dining Dollars Plan · active</Text>
        </View>
      </View>

      {!saved.loaded ? (
        <Helper tone="muted">Loading preferences…</Helper>
      ) : (
        <View style={styles.form}>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Balance</Text>
              <View style={styles.currency}>
                <Text style={styles.currencySign}>$</Text>
                <TextInput
                  accessibilityLabel="Balance"
                  value={balance}
                  onChangeText={setBalance}
                  keyboardType="decimal-pad"
                  style={styles.currencyInput}
                />
              </View>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Daily Target</Text>
              <View style={styles.currency}>
                <Text style={styles.currencySign}>$</Text>
                <TextInput
                  accessibilityLabel="Daily Target"
                  value={target}
                  onChangeText={setTarget}
                  keyboardType="decimal-pad"
                  style={styles.currencyInput}
                />
              </View>
            </View>
          </View>

          <ChoiceGroup title="Your Goals & Dietary">
            <ChoiceList>
              {NUTRITION_PRIORITIES.map((value) => (
                <ChoiceChip
                  key={value}
                  label={value}
                  selected={preferences.nutrition_priorities.includes(value)}
                  onPress={() => toggleChoice("nutrition_priorities", value)}
                />
              ))}
              {DIETARY_OPTIONS.map((value) => (
                <ChoiceChip
                  key={value}
                  label={value}
                  selected={preferences.dietary_restrictions.includes(value)}
                  onPress={() => toggleChoice("dietary_restrictions", value)}
                />
              ))}
            </ChoiceList>
            {preferences.dietary_restrictions.includes("Halal-friendly") && (
              <Helper>{HALAL_FRIENDLY_NOTE}</Helper>
            )}
          </ChoiceGroup>

          <AvoidancePicker
            inputHeight={52}
            allergens={preferences.allergens}
            excludedFoods={preferences.excluded_foods}
            onAllergensChange={(allergens) => update({ allergens })}
            onExcludedFoodsChange={(excluded_foods) => update({ excluded_foods })}
          />

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Settings
            </Text>
            <View style={styles.settingCard}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Budget alerts &amp; tips</Text>
                <Text style={styles.settingNote}>Notify when nearing daily Dining Dollar target</Text>
              </View>
              <Switch
                accessibilityLabel="Budget alerts & tips"
                value={preferences.budget_alerts_enabled}
                onValueChange={(budget_alerts_enabled) => update({ budget_alerts_enabled })}
                trackColor={{ true: palette.mode === "dark" ? "#2e7d62" : "#154734" }}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Appearance
            </Text>
            <View style={styles.settingCard}>
              <View style={styles.themeCard}>
                <Text style={styles.settingTitle}>Theme</Text>
                <View style={styles.themeOptions}>
                  {(["light", "dark"] as const).map((option) => {
                    const active = preferences.theme === option;
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityLabel={option === "light" ? "Light" : "Dark"}
                        accessibilityState={{ selected: active }}
                        style={[styles.themeOption, active && styles.themeOptionActive]}
                        onPress={() => update({ theme: option })}>
                        <Icon
                          name={option === "light" ? "sun" : "moon"}
                          color={active ? "#ffffff" : palette.mode === "dark" ? "#b8b8b8" : palette.muted}
                          size={17}
                        />
                        <Text style={[styles.themeText, active && styles.themeTextActive]}>
                          {option === "light" ? "Light" : "Dark"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* On the web these two are links to #privacy and #terms; the pages don't exist yet. */}
          <View style={styles.legal}>
            <Text style={styles.legalLink}>Privacy policy</Text>
            <Text style={styles.legalLink}>Terms of use</Text>
          </View>
          {shownError ? <Helper tone="error">{shownError}</Helper> : null}
          {notice ? <Helper tone="muted">{notice}</Helper> : null}
          <PrimaryButton
            label={saving ? "Saving…" : "Save preferences"}
            onPress={() => void handleSave()}
            disabled={saving}
          />
          {logoutError ? <Helper tone="error">{logoutError}</Helper> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            style={styles.logout}
            onPress={() => void handleSignOut()}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      )}
    </Page>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radii.card,
      backgroundColor: p.surface,
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    summaryCopy: { flex: 1, minWidth: 0, gap: 3 },
    summaryName: { fontSize: 15, fontWeight: "700", color: p.heading },
    summaryPlan: { fontSize: 11, color: p.muted },
    form: { gap: 16 },
    metrics: { flexDirection: "row", gap: 10 },
    metric: { flex: 1, gap: 6 },
    metricLabel: { fontSize: 11, fontWeight: "700", color: p.text },
    currency: {
      height: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radii.field,
      backgroundColor: p.surface,
    },
    currencySign: { fontSize: 14, color: p.muted },
    currencyInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: "700", color: p.inputText },
    section: { gap: 10 },
    sectionTitle: {
      marginBottom: -2,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.275,
      textTransform: "uppercase",
      color: p.muted,
    },
    settingCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radii.tile,
      backgroundColor: p.surface,
    },
    settingCopy: { flex: 1, gap: 3 },
    settingTitle: { fontSize: 13, fontWeight: "700", color: p.heading },
    settingNote: { fontSize: 10, color: p.muted },
    themeCard: { flex: 1 },
    themeOptions: { flexDirection: "row", gap: 10, marginTop: 12 },
    themeOption: {
      flex: 1,
      minHeight: 58,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: p.chipBorder,
      borderRadius: radii.input,
      backgroundColor: p.chipBg,
    },
    themeOptionActive: { borderColor: p.selectedBorder, backgroundColor: p.selectedBg },
    themeText: { fontSize: 11, fontWeight: "700", color: p.chipText },
    themeTextActive: { color: p.selectedText },
    legal: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 24,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    legalLink: { fontSize: 11, fontWeight: "700", textDecorationLine: "underline", color: p.muted },
    logout: { padding: 7, alignItems: "center" },
    logoutText: { fontSize: 13, fontWeight: "700", color: p.logout },
  });
