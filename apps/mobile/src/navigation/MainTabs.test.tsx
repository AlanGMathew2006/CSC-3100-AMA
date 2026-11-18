import { fireEvent, render, screen } from "@testing-library/react-native";
import { api } from "../lib/api";
import { DASHBOARD, MENU, PREFERENCES, PROFILE, RECOMMENDATIONS } from "../test/fixtures";
import { MainTabs } from "./MainTabs";

jest.mock("../lib/api", () => ({
  api: {
    fetchDashboard: jest.fn(),
    fetchMenu: jest.fn(),
    fetchRecommendations: jest.fn(),
    fetchPreferences: jest.fn(),
    logMeal: jest.fn(),
    updatePreferences: jest.fn(),
    updateProfile: jest.fn(),
  },
}));
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { email: "student@example.com", user_metadata: {} }, signOut: jest.fn() }),
}));

const mocked = jest.mocked(api);

beforeEach(() => {
  mocked.fetchDashboard.mockReset().mockResolvedValue(DASHBOARD);
  mocked.fetchMenu.mockReset().mockResolvedValue(MENU);
  mocked.fetchRecommendations.mockReset().mockResolvedValue(RECOMMENDATIONS);
  mocked.fetchPreferences.mockReset().mockResolvedValue(PREFERENCES);
});

describe("MainTabs", () => {
  it("has Home, Explore, Saved and Profile tabs, starting on the dashboard", async () => {
    await render(<MainTabs profile={PROFILE} onProfileChanged={jest.fn()} />);
    for (const name of ["Home", "Explore", "Saved", "Profile"]) {
      expect(screen.getByRole("tab", { name })).toBeTruthy();
    }
    expect(screen.getByRole("tab", { name: "Home" }).props.accessibilityState.selected).toBe(true);
    expect(await screen.findByText("What should I eat next?")).toBeTruthy();
  });

  it("says Explore and Saved are coming in the next phase", async () => {
    await render(<MainTabs profile={PROFILE} onProfileChanged={jest.fn()} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Explore" }));
    expect(await screen.findByText("Explore Meals")).toBeTruthy();
    expect(screen.getByText(/Explore is coming in the next phase/)).toBeTruthy();

    await fireEvent.press(screen.getByRole("tab", { name: "Saved" }));
    expect(await screen.findByText("Saved Plans")).toBeTruthy();
    expect(screen.getByText(/Saved plans are coming in the next phase/)).toBeTruthy();
  });
});
