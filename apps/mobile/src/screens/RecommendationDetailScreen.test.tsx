import { recommendationLog, type Recommendation } from "@csc-3100-ama/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../lib/api";
import { MENU, comboRecommendation, fries, plateRecommendation, subRecommendation } from "../test/fixtures";
import { RecommendationDetailScreen } from "./RecommendationDetailScreen";

jest.mock("../lib/api", () => ({ api: { fetchMenu: jest.fn(), logMeal: jest.fn() } }));
const mockToast = jest.fn();
jest.mock("../components/Toast", () => ({ useToast: () => mockToast }));

const mocked = jest.mocked(api);

async function renderDetail(rec: Recommendation) {
  const onBack = jest.fn();
  await render(<RecommendationDetailScreen rec={rec} onBack={onBack} />);
  return { onBack };
}

beforeEach(() => {
  mockToast.mockReset();
  mocked.fetchMenu.mockReset().mockResolvedValue(MENU);
  mocked.logMeal.mockReset().mockResolvedValue({});
});

describe("RecommendationDetailScreen", () => {
  it("shows a combo with its price, location and the items marked in combo", async () => {
    await renderDetail(comboRecommendation);
    expect(screen.getByText("Recommended Meal")).toBeTruthy();
    expect(screen.getByText("Chick-fil-A Deluxe Sandwich Meal")).toBeTruthy();
    expect(screen.getByText("Chick-fil-A (1901 Marketplace)")).toBeTruthy();
    expect(screen.getAllByText("$12.45").length).toBeGreaterThan(0);
    expect(screen.getByText("Chick-fil-A Deluxe Sandwich Meal combo, $12.45")).toBeTruthy();
    expect(screen.getByText("What's in this meal")).toBeTruthy();
    expect(screen.getAllByText("in combo")).toHaveLength(3);
    expect(await screen.findByText("490 cal · 29g protein · 44g carbs · 22g fat")).toBeTruthy();
    // The tea has no fat value: it says so instead of showing 0.
    expect(screen.getByText("120 cal · 0g protein · 31g carbs · fat unavailable")).toBeTruthy();
  });

  it("says nutrition is loading until the menu arrives", async () => {
    mocked.fetchMenu.mockReturnValue(new Promise(() => {}));
    await renderDetail(comboRecommendation);
    expect(screen.getAllByText("Loading nutrition…")).toHaveLength(3);
  });

  it("shows the menu error", async () => {
    mocked.fetchMenu.mockRejectedValue(new Error("Can't reach the PolyProvision server. Try again."));
    await renderDetail(comboRecommendation);
    expect(await screen.findByText("Can't reach the PolyProvision server. Try again.")).toBeTruthy();
  });

  it("lists half-and-half bases as ½", async () => {
    await renderDetail(plateRecommendation);
    expect(screen.getByText("½ Fried Rice")).toBeTruthy();
    expect(await screen.findByText("305 cal · 8g protein · 55g carbs · 7g fat")).toBeTruthy();
  });

  it("shows the unit price for standalone items", async () => {
    await renderDetail(subRecommendation);
    // The heading and the item line both say it.
    expect(screen.getAllByText("2× Oven-Roasted Turkey")).toHaveLength(2);
    expect(screen.getByText("$8.49 each")).toBeTruthy();
    expect(screen.getByText("$16.98")).toBeTruthy();
    expect(screen.queryByText(/combo, /)).toBeNull();
  });

  it("shows the explanation and Macro Match", async () => {
    await renderDetail(comboRecommendation);
    expect(screen.getByText("Fit for your next meal")).toBeTruthy();
    expect(screen.getByText(comboRecommendation.explanation)).toBeTruthy();
    expect(screen.getByText(/^Macro Match \d+$/)).toBeTruthy();
    expect(screen.getByText("Fat")).toBeTruthy();
    expect(screen.getAllByText("unavailable").length).toBeGreaterThan(0);
  });

  it("says allergen info is incomplete when an item is unverified", async () => {
    await renderDetail(comboRecommendation);
    // Once the menu loads, the tea (unverified) keeps the list incomplete.
    expect(await screen.findByText("Allergen info incomplete")).toBeTruthy();
    expect(screen.getByText("Contains at least: Milk, Egg, Wheat, Soy, Sesame")).toBeTruthy();
    expect(
      screen.getByText(/Combined from each item's published allergen info\. Shared kitchens may cause cross-contact\./),
    ).toBeTruthy();
  });

  it("says no major allergens only when every item is verified", async () => {
    const friesOnly: Recommendation = {
      ...subRecommendation,
      combo: null,
      items: [{ meal_id: fries.id, name: fries.name, quantity: 1, unit_price: 3.45, combo_part: null, meal_role: "side" }],
      total_price: 3.45,
    };
    await renderDetail(friesOnly);
    expect(await screen.findByText("No major allergens listed by the restaurants.")).toBeTruthy();
    expect(screen.queryByText("Allergen info incomplete")).toBeNull();
  });

  it("adds the meal to today, shows the toast and goes back", async () => {
    const { onBack } = await renderDetail(comboRecommendation);
    await fireEvent.press(screen.getByRole("button", { name: "Add to Today" }));
    await waitFor(() => expect(onBack).toHaveBeenCalled());
    expect(mocked.logMeal).toHaveBeenCalledWith(recommendationLog(comboRecommendation));
    expect(mocked.logMeal.mock.calls[0]?.[0]).toMatchObject({
      price: 12.45,
      location_name: "Chick-fil-A (1901 Marketplace)",
    });
    expect(mockToast).toHaveBeenCalledWith("Meal added to today");
  });

  it("shows the error and stays on the page when adding fails", async () => {
    mocked.logMeal.mockRejectedValue(new Error("Couldn't save the meal (stubbed failure)"));
    const { onBack } = await renderDetail(comboRecommendation);
    await fireEvent.press(screen.getByRole("button", { name: "Add to Today" }));
    expect(await screen.findByText("Couldn't save the meal (stubbed failure)")).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    // Try again works.
    mocked.logMeal.mockResolvedValue({});
    await fireEvent.press(screen.getByRole("button", { name: "Add to Today" }));
    await waitFor(() => expect(onBack).toHaveBeenCalled());
  });

  it("goes back from the back button and the Back button", async () => {
    const { onBack } = await renderDetail(comboRecommendation);
    await fireEvent.press(screen.getByRole("button", { name: "Recommended Meal" }));
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
