import { recommendationLog, type RecommendationsResponse } from "@csc-3100-ama/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { api } from "../lib/api";
import {
  DASHBOARD,
  MENU,
  PREFERENCES,
  PROFILE,
  RECOMMENDATIONS,
  comboRecommendation,
  plateRecommendation,
} from "../test/fixtures";
import { DashboardScreen } from "./DashboardScreen";

// The API layer is mocked; no network, no Supabase.
jest.mock("../lib/api", () => ({
  api: {
    fetchDashboard: jest.fn(),
    fetchMenu: jest.fn(),
    fetchRecommendations: jest.fn(),
    fetchPreferences: jest.fn(),
    logMeal: jest.fn(),
  },
}));
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { email: "student@example.com", user_metadata: {} } }),
}));
const mockToast = jest.fn();
jest.mock("../components/Toast", () => ({ useToast: () => mockToast }));

const mocked = jest.mocked(api);

// Mock data: 1,200 of 2,000 calories eaten today, $16 of a $20 daily target spent.
const dashboard = {
  ...DASHBOARD,
  profile: { ...PROFILE, dining_dollars_balance: 120.5, daily_spending_target: 20 },
  today: { calories: 1200.4, protein_g: 60, carbs_g: 100, fat_g: 30, fiber_g: 0, spent: 16 },
  week: { calories: 9000, protein_g: 400, carbs_g: 700, fat_g: 250, fiber_g: 20, spent: 90 },
  goals: { calories: 2000, protein_g: 100, carbs_g: 250, fat_g: 70, fiber_g: null },
  recent_logs: [{ name: "Chicken Bowl", protein_g: 40 }],
};

async function renderDashboard() {
  const props = { onOpenRecommendation: jest.fn(), onNavigate: jest.fn() };
  const result = await render(<DashboardScreen {...props} />);
  return { ...result, props };
}

beforeEach(() => {
  mockToast.mockReset();
  mocked.fetchDashboard.mockReset().mockResolvedValue(dashboard);
  mocked.fetchMenu.mockReset().mockResolvedValue(MENU);
  mocked.fetchRecommendations.mockReset().mockResolvedValue(RECOMMENDATIONS);
  mocked.fetchPreferences.mockReset().mockResolvedValue({ ...PREFERENCES, budget_alerts_enabled: true });
  mocked.logMeal.mockReset().mockResolvedValue({});
});

describe("DashboardScreen nutrition ring", () => {
  it("lists Protein, Carbs and Fat with their kcal beside the ring, and no Fiber there", async () => {
    mocked.fetchRecommendations.mockResolvedValue(RECOMMENDATIONS);
    await renderDashboard();
    // 60 g protein, 100 g carbs, 30 g fat today.
    expect(await screen.findByText("Protein · 240 kcal")).toBeTruthy();
    expect(screen.getByText("Carbs · 400 kcal")).toBeTruthy();
    expect(screen.getByText("Fat · 270 kcal")).toBeTruthy();
    expect(screen.getAllByText("Fiber")).toHaveLength(1); // only the Nutrient Summary tile
    expect(screen.getAllByTestId(/^ring-segment-/)).toHaveLength(3);
  });
});

describe("DashboardScreen recommendations", () => {
  it("shows a loading message until the recommendations arrive", async () => {
    let resolve: (value: RecommendationsResponse) => void = () => {};
    mocked.fetchRecommendations.mockReturnValue(new Promise((r) => (resolve = r)));
    await renderDashboard();
    expect(screen.getByText("Loading meal recommendations…")).toBeTruthy();
    resolve(RECOMMENDATIONS);
    expect(await screen.findByText("What should I eat next?")).toBeTruthy();
    expect(screen.queryByText("Loading meal recommendations…")).toBeNull();
  });

  it("shows the error with a Retry that loads them again", async () => {
    mocked.fetchRecommendations.mockRejectedValueOnce(new Error("Can't reach the PolyProvision server. Try again."));
    await renderDashboard();
    expect(await screen.findByText(/Can't reach the PolyProvision server/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("link", { name: "Retry" }));
    expect(await screen.findByText("What should I eat next?")).toBeTruthy();
    expect(mocked.fetchRecommendations).toHaveBeenCalledTimes(2);
  });

  it("explains an empty result and offers a next step", async () => {
    mocked.fetchRecommendations.mockResolvedValue({ ...RECOMMENDATIONS, recommendations: [], reason: "no_feasible_meals" });
    const { props } = await renderDashboard();
    expect(
      await screen.findByText(
        "No meals fit your budget and dietary filters right now. Try adjusting your filters.",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("link", { name: "Adjust your filters" }));
    expect(props.onNavigate).toHaveBeenCalledWith("Profile");
  });

  it.each([
    ["over_daily_budget", "You've reached today's Dining Dollar target, so there are no recommendations right now.", "Browse all meals"],
    ["no_eligible_locations", "None of your dining locations are open and taking Dining Dollars right now.", "Browse all meals"],
  ] as const)("shows the %s message", async (reason, message, action) => {
    mocked.fetchRecommendations.mockResolvedValue({ ...RECOMMENDATIONS, recommendations: [], reason });
    const { props } = await renderDashboard();
    expect(await screen.findByText(message)).toBeTruthy();
    await fireEvent.press(screen.getByRole("link", { name: action }));
    expect(props.onNavigate).toHaveBeenCalledWith("Explore");
  });

  it("lists the hero pick with Macro Match, then the other options", async () => {
    await renderDashboard();
    expect(await screen.findByText("What should I eat next?")).toBeTruthy();
    // The hero card: combo name with its items, price, location and numbers.
    expect(screen.getAllByText("$12.45").length).toBeGreaterThan(0);
    expect(screen.getByText(/^Macro Match \d+$/)).toBeTruthy();
    expect(screen.getByText(comboRecommendation.explanation)).toBeTruthy();
    expect(screen.getByText(/^Includes: Chick-fil-A Deluxe Sandwich \+ Waffle Potato Fries/)).toBeTruthy();
    // Unknown fat shows as unavailable, never 0 or a dash.
    expect(screen.getByText("unavailable")).toBeTruthy();
    // The other options, each with a Macro Match line.
    expect(screen.getByText("Best options for you today")).toBeTruthy();
    expect(screen.getByText(new RegExp(`^Macro Match \\d+ · ${plateRecommendation.explanation}$`))).toBeTruthy();
    expect(screen.getAllByText("$11.30").length).toBeGreaterThan(0);
  });

  it("opens the recommendation from the card and View Meal", async () => {
    const { props } = await renderDashboard();
    await fireEvent.press(await screen.findByRole("button", { name: "View Meal" }));
    expect(props.onOpenRecommendation).toHaveBeenCalledWith(comboRecommendation);
  });

  it("adds the hero pick to today with a toast and reloads the recommendations", async () => {
    await renderDashboard();
    await fireEvent.press(await screen.findByRole("button", { name: "Add to Today" }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith("Meal added to today"));
    expect(mocked.logMeal).toHaveBeenCalledWith(recommendationLog(comboRecommendation));
    expect(mocked.fetchDashboard).toHaveBeenCalledTimes(2);
    expect(mocked.fetchRecommendations).toHaveBeenCalledTimes(2);
  });

  it("shows the server's message and no toast when adding fails", async () => {
    mocked.logMeal.mockRejectedValue(new Error("Couldn't save the meal"));
    await renderDashboard();
    await fireEvent.press(await screen.findByRole("button", { name: "Add to Today" }));
    expect(await screen.findByText(/Couldn't save the meal/)).toBeTruthy();
    expect(mockToast).not.toHaveBeenCalled();
  });
});

describe("DashboardScreen nutrition and Dining Dollars", () => {
  it("greets the user by their profile name", async () => {
    mocked.fetchDashboard.mockResolvedValue({ ...dashboard, profile: { ...PROFILE, display_name: "Sam" } });
    await renderDashboard();
    expect(await screen.findByText("Sam")).toBeTruthy();
    expect(screen.getByText(/^Good (morning|afternoon|evening),$/)).toBeTruthy();
  });

  it("shows today's nutrition, the summary tiles and Dining Dollars", async () => {
    await renderDashboard();
    expect(await screen.findByText("Today's Nutrition")).toBeTruthy();
    expect(screen.getByText("800")).toBeTruthy();
    expect(screen.getByText("Calories Remaining")).toBeTruthy();
    expect(screen.getByText("1,200 / 2,000 kcal")).toBeTruthy();
    expect(screen.getByText("60 / 100g")).toBeTruthy();
    // No fiber goal.
    expect(screen.getByText("0g · no goal")).toBeTruthy();
    expect(screen.getByText("$120.50")).toBeTruthy();
    expect(screen.getByText("$16.00 of $20.00 target spent today")).toBeTruthy();
    expect(screen.getByText("Near target")).toBeTruthy();
    expect(screen.getByText("Spent this week: $90.00")).toBeTruthy();
    expect(screen.getByText("Recommended weekly budget: $140.00")).toBeTruthy();
    expect(screen.getByText("You're $50.00 under your weekly budget.")).toBeTruthy();
  });

  it("switches to the weekly view", async () => {
    await renderDashboard();
    await fireEvent.press(await screen.findByRole("button", { name: "Weekly" }));
    expect(screen.getByText("This Week's Nutrition")).toBeTruthy();
    expect(screen.getByText("Weekly average")).toBeTruthy();
    expect(screen.getByText("1,286")).toBeTruthy();
    expect(screen.getByText("9,000 / 14,000 kcal")).toBeTruthy();
  });

  it("says so when there is no calorie goal", async () => {
    mocked.fetchDashboard.mockResolvedValue({ ...dashboard, goals: null });
    await renderDashboard();
    expect(await screen.findByText("No calorie goal set")).toBeTruthy();
    expect(screen.getByText("Calories Logged")).toBeTruthy();
  });

  it("hides the budget tag when budget alerts are off", async () => {
    mocked.fetchPreferences.mockResolvedValue({ ...PREFERENCES, budget_alerts_enabled: false });
    await renderDashboard();
    await screen.findByText("$16.00 of $20.00 target spent today");
    expect(screen.queryByText("Near target")).toBeNull();
  });

  it("opens the nutrient sheet from a summary tile", async () => {
    await renderDashboard();
    await fireEvent.press(await screen.findByRole("button", { name: "Protein 60 / 100g" }));
    const sheet = await screen.findByText("Top sources today");
    expect(sheet).toBeTruthy();
    expect(screen.getByText("40g protein")).toBeTruthy();
    expect(screen.getByText("40g remaining")).toBeTruthy();
    expect(within(screen.getByText("Chicken Bowl").parent as never).queryByText("Chicken Bowl")).toBeTruthy();
  });

  it("shows the dashboard error with a Retry", async () => {
    mocked.fetchDashboard.mockRejectedValueOnce(new Error("Your session expired. Please log in again."));
    await renderDashboard();
    expect(await screen.findByText(/Your session expired/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("link", { name: "Retry" }));
    await waitFor(() => expect(mocked.fetchDashboard).toHaveBeenCalledTimes(2));
  });
});
