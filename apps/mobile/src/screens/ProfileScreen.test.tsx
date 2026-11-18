import { HALAL_FRIENDLY_NOTE } from "@csc-3100-ama/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { api } from "../lib/api";
import { PREFERENCES, PROFILE } from "../test/fixtures";
import { ThemeProvider, useTheme } from "../theme";
import { ProfileScreen } from "./ProfileScreen";

jest.mock("../lib/api", () => ({
  api: { fetchPreferences: jest.fn(), updatePreferences: jest.fn(), updateProfile: jest.fn() },
}));
const mockSignOut = jest.fn();
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { email: "student@example.com", user_metadata: {} }, signOut: mockSignOut }),
}));

const mocked = jest.mocked(api);

function ThemeProbe() {
  const { mode } = useTheme();
  return <Text>{`theme: ${mode}`}</Text>;
}

async function renderProfile() {
  const onProfileChanged = jest.fn();
  await render(
    <ThemeProvider>
      <ProfileScreen profile={PROFILE} onProfileChanged={onProfileChanged} />
      <ThemeProbe />
    </ThemeProvider>,
  );
  return { onProfileChanged };
}

const save = () => fireEvent.press(screen.getByRole("button", { name: "Save preferences" }));

beforeEach(() => {
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mocked.fetchPreferences.mockReset().mockResolvedValue({
    ...PREFERENCES,
    nutrition_priorities: ["Balanced"],
    allergens: ["milk"],
    budget_alerts_enabled: true,
  });
  mocked.updatePreferences.mockReset().mockResolvedValue(PREFERENCES);
  mocked.updateProfile.mockReset().mockResolvedValue(PROFILE);
});

describe("ProfileScreen", () => {
  it("shows the profile summary and the saved preferences", async () => {
    await renderProfile();
    expect(screen.getByText("Preferences")).toBeTruthy();
    expect(screen.getByText("Test Student")).toBeTruthy();
    expect(screen.getByText("Dining Dollars Plan · active")).toBeTruthy();
    expect(await screen.findByDisplayValue("412.5")).toBeTruthy();
    expect(screen.getByDisplayValue("25")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Balanced" }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole("button", { name: "Vegan" }).props.accessibilityState.selected).toBe(false);
    expect(screen.getByRole("button", { name: "Milk" }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByText("Budget alerts & tips")).toBeTruthy();
    expect(screen.getByText("Privacy policy")).toBeTruthy();
  });

  it("shows a loading message until the preferences arrive", async () => {
    mocked.fetchPreferences.mockReturnValue(new Promise(() => {}));
    await renderProfile();
    expect(screen.getByText("Loading preferences…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save preferences" })).toBeNull();
  });

  it("saves the balance, target and preferences with the same requests as the web app", async () => {
    const { onProfileChanged } = await renderProfile();
    await screen.findByDisplayValue("412.5");
    await fireEvent.changeText(screen.getByLabelText("Balance"), "300.25");
    await fireEvent.changeText(screen.getByLabelText("Daily Target"), "30");
    await fireEvent.press(screen.getByRole("button", { name: "High protein" }));
    await fireEvent.press(screen.getByRole("button", { name: "Halal-friendly" }));
    expect(screen.getByText(HALAL_FRIENDLY_NOTE)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Peanut" }));
    await fireEvent.press(screen.getByRole("button", { name: "Milk" }));
    await fireEvent.changeText(screen.getByLabelText("Food to avoid"), "Mushroom");
    await fireEvent.press(screen.getByRole("button", { name: "Add" }));
    await save();

    expect(await screen.findByText("Preferences saved.")).toBeTruthy();
    expect(mocked.updateProfile).toHaveBeenCalledWith({
      dining_dollars_balance: 300.25,
      daily_spending_target: 30,
    });
    expect(mocked.updatePreferences).toHaveBeenCalledWith({
      ...PREFERENCES,
      nutrition_priorities: ["Balanced", "High protein"],
      dietary_restrictions: ["Halal-friendly"],
      allergens: ["peanut"],
      excluded_foods: ["Mushroom"],
      budget_alerts_enabled: true,
    });
    expect(onProfileChanged).toHaveBeenCalled();
  });

  it("rejects a negative balance or target without calling the API", async () => {
    await renderProfile();
    await fireEvent.changeText(await screen.findByLabelText("Balance"), "-5");
    await save();
    expect(await screen.findByText("Enter a valid non-negative Dining Dollars balance.")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Balance"), "5");
    await fireEvent.changeText(screen.getByLabelText("Daily Target"), "abc");
    await save();
    expect(await screen.findByText("Enter a valid non-negative daily target.")).toBeTruthy();
    expect(mocked.updateProfile).not.toHaveBeenCalled();
    expect(mocked.updatePreferences).not.toHaveBeenCalled();
  });

  it("shows the server's message when saving fails", async () => {
    mocked.updatePreferences.mockRejectedValue(new Error("Database unavailable"));
    const { onProfileChanged } = await renderProfile();
    await screen.findByLabelText("Balance");
    await save();
    expect(await screen.findByText("Database unavailable")).toBeTruthy();
    expect(screen.queryByText("Preferences saved.")).toBeNull();
    expect(onProfileChanged).not.toHaveBeenCalled();
  });

  it("shows the preferences error but still lets the user edit", async () => {
    mocked.fetchPreferences.mockRejectedValue(new Error("Can't reach the PolyProvision server. Try again."));
    await renderProfile();
    expect(await screen.findByText("Can't reach the PolyProvision server. Try again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save preferences" })).toBeTruthy();
  });

  it("switches the theme right away and saves it", async () => {
    await renderProfile();
    await screen.findByLabelText("Balance");
    expect(screen.getByText("theme: light")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Dark" }));
    expect(screen.getByText("theme: dark")).toBeTruthy();
    await save();
    await waitFor(() => expect(mocked.updatePreferences).toHaveBeenCalled());
    expect(mocked.updatePreferences.mock.calls[0]?.[0]).toMatchObject({ theme: "dark" });
  });

  it("logs out, and shows the error when that fails", async () => {
    await renderProfile();
    await screen.findByLabelText("Balance");
    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));
    expect(mockSignOut).toHaveBeenCalled();

    mockSignOut.mockRejectedValue(new Error("Couldn't sign out. Try again."));
    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByText("Couldn't sign out. Try again.")).toBeTruthy();
  });
});
