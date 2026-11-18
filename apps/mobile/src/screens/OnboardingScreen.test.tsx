import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../lib/api";
import { OnboardingScreen } from "./OnboardingScreen";

jest.mock("../lib/api", () => ({
  api: {
    fetchLocations: jest.fn(),
    completeOnboarding: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

const mockedApi = jest.mocked(api);

// Mock data only.
const locations = [
  { id: "loc-1", name: "Chick-fil-A (1901 Marketplace)", restaurant: "Chick-fil-A", campus_area: "1901 Marketplace" },
  { id: "loc-2", name: "Campus Market", restaurant: null, campus_area: null },
];

async function fillMoney(balance = "500", target = "25.50") {
  await fireEvent.changeText(screen.getByLabelText("Dining Dollar Balance"), balance);
  await fireEvent.changeText(screen.getByLabelText("Daily Spending Target"), target);
}

const submit = () => fireEvent.press(screen.getByRole("button", { name: "See my recommendations" }));

beforeEach(() => {
  mockedApi.fetchLocations.mockReset().mockResolvedValue(locations);
  mockedApi.completeOnboarding.mockReset().mockResolvedValue(undefined);
  mockedApi.updatePreferences.mockReset().mockResolvedValue({} as never);
});

describe("OnboardingScreen", () => {
  it("shows the same copy and the dining locations from the API", async () => {
    await render(<OnboardingScreen onComplete={jest.fn()} />);
    expect(screen.getByText("Set Your Plan")).toBeTruthy();
    expect(
      screen.getByText("Enter your budget and preferences to personalize your recommendations."),
    ).toBeTruthy();
    expect(screen.getByText("Enter your plan metrics")).toBeTruthy();
    expect(await screen.findByText("1901 Marketplace")).toBeTruthy();
    // Falls back to the location name when there is no campus area or restaurant.
    expect(screen.getByText("Campus Market")).toBeTruthy();
    expect(screen.getByText("Allergens")).toBeTruthy();
    expect(screen.getByText("Foods to avoid")).toBeTruthy();
  });

  it("asks for a number in every field before calling the API", async () => {
    await render(<OnboardingScreen onComplete={jest.fn()} />);
    await submit();
    expect(await screen.findByText("Enter a number of 0 or more in every field.")).toBeTruthy();
    expect(mockedApi.completeOnboarding).not.toHaveBeenCalled();

    await fillMoney("-5", "20");
    await submit();
    expect(await screen.findByText("Enter a number of 0 or more in every field.")).toBeTruthy();
    expect(mockedApi.completeOnboarding).not.toHaveBeenCalled();
  });

  it("asks for whole numbers for the nutrition goals", async () => {
    await render(<OnboardingScreen onComplete={jest.fn()} />);
    await fillMoney();
    await fireEvent.press(screen.getByRole("button", { name: "Adjust daily nutrition targets" }));
    await fireEvent.changeText(screen.getByLabelText("Daily protein (g)"), "99.5");
    await submit();
    expect(await screen.findByText("Enter whole numbers for your nutrition goals.")).toBeTruthy();
    expect(mockedApi.completeOnboarding).not.toHaveBeenCalled();
  });

  it("saves the plan with the same request body as the web app", async () => {
    const onComplete = jest.fn();
    await render(<OnboardingScreen onComplete={onComplete} />);
    await fillMoney();
    await fireEvent.press(await screen.findByRole("button", { name: "High protein" }));
    await fireEvent.press(screen.getByRole("button", { name: "Vegetarian" }));
    await fireEvent.press(screen.getByRole("button", { name: "1901 Marketplace" }));
    await submit();

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mockedApi.completeOnboarding).toHaveBeenCalledWith({
      dining_dollars_balance: 500,
      daily_spending_target: 25.5,
      calories: 2000,
      protein_g: 100,
      carbs_g: 250,
      fat_g: 70,
      nutrition_priorities: ["High protein"],
      dietary_restrictions: ["Vegetarian"],
      preferred_location_ids: ["loc-1"],
    });
    // Nothing to save through the preferences endpoint.
    expect(mockedApi.updatePreferences).not.toHaveBeenCalled();
  });

  it("saves allergens and avoided foods through the preferences endpoint", async () => {
    const onComplete = jest.fn();
    await render(<OnboardingScreen onComplete={onComplete} />);
    await fillMoney();
    await fireEvent.press(screen.getByRole("button", { name: "Peanut" }));
    expect(
      screen.getByText("Meals without verified allergen information are hidden while an allergen is selected."),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Food to avoid"), "  Mushroom ");
    await fireEvent.press(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("button", { name: "Remove Mushroom" })).toBeTruthy();
    await submit();

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mockedApi.updatePreferences).toHaveBeenCalledWith({
      allergens: ["peanut"],
      excluded_foods: ["Mushroom"],
    });
  });

  it("says so when the plan saved but the allergens did not", async () => {
    mockedApi.updatePreferences.mockRejectedValue(new Error("nope"));
    const onComplete = jest.fn();
    await render(<OnboardingScreen onComplete={onComplete} />);
    await fillMoney();
    await fireEvent.press(screen.getByRole("button", { name: "Milk" }));
    await submit();

    expect(
      await screen.findByText("Your plan was saved, but we couldn't save your allergens and avoided foods. Try again."),
    ).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("shows the server's message when saving the plan fails", async () => {
    mockedApi.completeOnboarding.mockRejectedValue(new Error("Database unavailable"));
    await render(<OnboardingScreen onComplete={jest.fn()} />);
    await fillMoney();
    await submit();
    expect(await screen.findByText("Database unavailable")).toBeTruthy();
  });

  it("lets the user retry when the locations fail to load", async () => {
    mockedApi.fetchLocations.mockRejectedValueOnce(new Error("Can't reach the PolyProvision server. Try again."));
    await render(<OnboardingScreen onComplete={jest.fn()} />);
    expect(await screen.findByText(/Can't reach the PolyProvision server/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("link", { name: "Retry" }));
    expect(await screen.findByText("1901 Marketplace")).toBeTruthy();
  });
});
