import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../auth";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { errorMessage } from "../../lib/errors";
import { fetchPreferences, updatePreferences, updateProfile } from "../../lib/api";
import type { Profile, UserPreferences } from "../../types/dashboard";

const PRIORITIES = ["High protein", "Lower calorie", "Balanced", "Budget-friendly"];
const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Halal-friendly", "Gluten-free", "No seafood"];
const EMPTY_PREFERENCES: UserPreferences = {
  dietary_restrictions: [],
  allergens: [],
  cuisine_preferences: [],
  preferred_location_ids: [],
  excluded_foods: [],
  nutrition_priorities: [],
  budget_alerts_enabled: true,
  theme: "light",
};

export function ProfilePage({
  profile,
  onNavigate,
  onProfileChanged,
}: {
  profile: Profile;
  onNavigate: (tab: AppTab) => void;
  onProfileChanged: () => void;
}) {
  const { user, signOut } = useAuth();
  const [preferences, setPreferences] = useState(EMPTY_PREFERENCES);
  const [balance, setBalance] = useState(String(profile.dining_dollars_balance));
  const [target, setTarget] = useState(String(profile.daily_spending_target ?? ""));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;
    void fetchPreferences()
      .then((savedPreferences) => {
        if (active) setPreferences({ ...EMPTY_PREFERENCES, ...savedPreferences });
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);

  const toggleChoice = (key: "nutrition_priorities" | "dietary_restrictions", value: string) => {
    setPreferences((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((entry) => entry !== value)
        : [...current[key], value],
    }));
  };

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    const balanceValue = Number(balance);
    const targetValue = Number(target);
    if (!Number.isFinite(balanceValue) || balanceValue < 0) {
      setError("Enter a valid non-negative Dining Dollars balance.");
      return;
    }
    if (!Number.isFinite(targetValue) || targetValue < 0) {
      setError("Enter a valid non-negative daily target.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        updateProfile({
          dining_dollars_balance: balanceValue,
          daily_spending_target: targetValue,
        }),
        updatePreferences(preferences),
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

  const name =
    profile.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Student";

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />
      <main className="app-content profile-content">
        <h1>Preferences</h1>
        <div className="profile-summary-card">
          <img src="/assets/figma/profile-avatar.jpg" alt="" />
          <div>
            <strong>{name}</strong>
            <span>Dining Dollars Plan · active</span>
          </div>
        </div>

        {loading ? (
          <p className="field-helper success" role="status">Loading preferences…</p>
        ) : (
          <form className="profile-form" onSubmit={handleSave}>
            <div className="profile-metrics">
              <label>
                Balance
                <span className="currency-input">
                  $<input value={balance} inputMode="decimal" onChange={(event) => setBalance(event.target.value)} />
                </span>
              </label>
              <label>
                Daily Target
                <span className="currency-input">
                  $<input value={target} inputMode="decimal" onChange={(event) => setTarget(event.target.value)} />
                </span>
              </label>
            </div>

            <fieldset className="choice-group">
              <legend>Your Goals &amp; Dietary</legend>
              <div className="choice-list">
                {PRIORITIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`choice-chip${preferences.nutrition_priorities.includes(value) ? " choice-chip--selected" : ""}`}
                    aria-pressed={preferences.nutrition_priorities.includes(value)}
                    onClick={() => toggleChoice("nutrition_priorities", value)}
                  >
                    {value}
                  </button>
                ))}
                {DIETARY_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`choice-chip${preferences.dietary_restrictions.includes(value) ? " choice-chip--selected" : ""}`}
                    aria-pressed={preferences.dietary_restrictions.includes(value)}
                    onClick={() => toggleChoice("dietary_restrictions", value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            <section className="profile-setting-section">
              <h2>Settings</h2>
              <label className="setting-card setting-switch">
                <span>
                  <strong>Budget alerts &amp; tips</strong>
                  <small>Notify when nearing daily Dining Dollar target</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences.budget_alerts_enabled}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      budget_alerts_enabled: event.target.checked,
                    }))
                  }
                />
              </label>
            </section>

            <section className="profile-setting-section">
              <h2>Appearance</h2>
              <div className="setting-card theme-setting">
                <strong>Theme</strong>
                <div className="theme-options">
                  {(["light", "dark"] as const).map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      className={`theme-option${preferences.theme === theme ? " theme-option--active" : ""}`}
                      aria-pressed={preferences.theme === theme}
                      onClick={() => setPreferences((current) => ({ ...current, theme }))}
                    >
                      <img src={`/assets/figma/${theme === "light" ? "sun" : "moon"}.svg`} alt="" />
                      {theme === "light" ? "Light" : "Dark"}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <p className="profile-legal">
              <a href="#privacy">Privacy policy</a>
              <a href="#terms">Terms of use</a>
            </p>
            {error && <p className="field-helper error" role="alert">{error}</p>}
            {notice && <p className="field-helper success" role="status">{notice}</p>}
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save preferences"}
            </button>
            {logoutError && <p className="field-helper error" role="alert">{logoutError}</p>}
            <button className="profile-logout" type="button" onClick={() => void handleSignOut()}>
              Log out
            </button>
          </form>
        )}
      </main>
      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}
