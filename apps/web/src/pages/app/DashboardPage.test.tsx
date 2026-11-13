import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecommendationsResponse } from "@csc-3100-ama/shared";
import * as api from "../../lib/api";
import {
  DASHBOARD,
  MENU,
  PREFERENCES,
  RECOMMENDATIONS,
  comboRecommendation,
  subRecommendation,
} from "../../test/fixtures";
import { DashboardPage } from "./DashboardPage";

// The API layer is mocked; no network, no Supabase.
vi.mock("../../lib/api");
vi.mock("../../auth", () => ({
  useAuth: () => ({ user: { email: "student@example.com", user_metadata: {} } }),
}));

const mocked = vi.mocked(api);

function renderDashboard() {
  const props = {
    onNavigate: vi.fn(),
    onSelectMeal: vi.fn(),
    onSelectRecommendation: vi.fn(),
    onToast: vi.fn(),
  };
  render(<DashboardPage {...props} />);
  return props;
}

beforeEach(() => {
  mocked.fetchDashboard.mockResolvedValue(DASHBOARD);
  mocked.fetchMenu.mockResolvedValue(MENU);
  mocked.fetchRecommendations.mockResolvedValue(RECOMMENDATIONS);
  mocked.fetchSavedMeals.mockResolvedValue([]);
  mocked.fetchPreferences.mockResolvedValue(PREFERENCES);
  mocked.logMeal.mockResolvedValue({});
});

describe("DashboardPage recommendations", () => {
  it("shows a loading message until the recommendations arrive", async () => {
    let resolve: (value: RecommendationsResponse) => void = () => {};
    mocked.fetchRecommendations.mockReturnValue(new Promise((r) => (resolve = r)));
    renderDashboard();
    expect(screen.getByRole("status").textContent).toBe("Loading meal recommendations…");
    resolve(RECOMMENDATIONS);
    expect(await screen.findByRole("heading", { name: "What should I eat next?" })).toBeTruthy();
    expect(screen.queryByText("Loading meal recommendations…")).toBeNull();
  });

  it("shows the error with a Retry that loads them again", async () => {
    mocked.fetchRecommendations.mockRejectedValueOnce(new Error("Can't reach the PolyProvision server. Try again."));
    renderDashboard();
    const alert = await screen.findByText(/Can't reach the PolyProvision server/);
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "What should I eat next?" })).toBeTruthy();
    expect(mocked.fetchRecommendations).toHaveBeenCalledTimes(2);
  });

  it("explains an empty result and offers a next step", async () => {
    mocked.fetchRecommendations.mockResolvedValue({ ...RECOMMENDATIONS, recommendations: [], reason: "no_feasible_meals" });
    const props = renderDashboard();
    expect(await screen.findByText(/No meals fit your budget and dietary filters right now/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Adjust your filters" }));
    expect(props.onNavigate).toHaveBeenCalledWith("profile");
  });

  it("offers Explore when no location is open", async () => {
    mocked.fetchRecommendations.mockResolvedValue({ ...RECOMMENDATIONS, recommendations: [], reason: "no_eligible_locations" });
    const props = renderDashboard();
    await userEvent.click(await screen.findByRole("button", { name: "Browse all meals" }));
    expect(props.onNavigate).toHaveBeenCalledWith("explore");
  });

  it("lists the hero pick and the next options with their Macro Match", async () => {
    renderDashboard();
    const hero = (await screen.findByRole("heading", { name: "What should I eat next?" })).closest("section")!;
    expect(within(hero).getByText("$12.45")).toBeTruthy();
    expect(within(hero).getByText(`Macro Match ${comboRecommendation.macro_match.score}`)).toBeTruthy();
    expect(within(hero).getByText(comboRecommendation.explanation)).toBeTruthy();
    // The card title is shortened; every item is still listed under it.
    expect(
      within(hero).getByText(
        "Includes: Chick-fil-A Deluxe Sandwich + Waffle Potato Fries (Medium) + Sweetened Iced Tea (Medium)",
      ),
    ).toBeTruthy();

    const options = screen.getByRole("heading", { name: "Best options for you today" }).closest("section")!;
    expect(within(options).getByText(/#1 Plate: The Original Orange Chicken \+ Broccoli Beef \+2 more/)).toBeTruthy();
    expect(within(options).getByText(/Includes: The Original Orange Chicken \+ Broccoli Beef \+ ½ Fried Rice \+ ½ Chow Mein/)).toBeTruthy();
    expect(
      within(options).getByText(`Macro Match ${subRecommendation.macro_match.score} · ${subRecommendation.explanation}`),
    ).toBeTruthy();
  });

  it("still shows recommendations when the menu fails to load", async () => {
    mocked.fetchMenu.mockRejectedValue(new Error("Menu is down"));
    const props = renderDashboard();
    expect(await screen.findByText("Menu is down")).toBeTruthy();
    const hero = (await screen.findByRole("heading", { name: "What should I eat next?" })).closest("section")!;
    expect(within(hero).getByText("$12.45")).toBeTruthy();
    // A single-item pick can't open its meal page without the menu, so it opens the recommendation.
    await userEvent.click(screen.getAllByRole("button", { name: /Oven-Roasted Turkey/ })[0]!);
    expect(props.onSelectRecommendation).toHaveBeenCalledWith(subRecommendation);
  });

  it("adds the hero pick to today at its total price", async () => {
    const props = renderDashboard();
    await userEvent.click(await screen.findByRole("button", { name: "Add to Today" }));
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith("Meal added to today"));
    expect(mocked.logMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Chick-fil-A Deluxe Sandwich Meal: Chick-fil-A Deluxe Sandwich + Waffle Potato Fries (Medium) + Sweetened Iced Tea (Medium)",
        price: 12.45,
        calories: 1030,
        fat_g: undefined,
      }),
    );
  });

  it("shows 'No goal' instead of a dash for a nutrient without a goal", async () => {
    renderDashboard();
    const fiber = (await screen.findAllByText("Fiber")).map((el) => el.closest("button")).find(Boolean)!;
    await waitFor(() => expect(within(fiber).getByText("0g · no goal")).toBeTruthy());
  });
});
