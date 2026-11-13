import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../lib/api";
import { MEAL_TARGETS, MENU, deluxeMeal, sandwich, subwaySub } from "../../test/fixtures";
import { MenuPage } from "./MenuPage";

vi.mock("../../lib/api");
const mocked = vi.mocked(api);

function renderMenu() {
  const props = { onNavigate: vi.fn(), onSelectMeal: vi.fn(), onSelectCombo: vi.fn(), onToast: vi.fn() };
  render(<MenuPage {...props} />);
  return props;
}

const card = async (name: string) =>
  (await screen.findByRole("button", { name: `Add ${name} to today` })).closest("article")!;

beforeEach(() => {
  mocked.fetchMenu.mockResolvedValue(MENU);
  mocked.fetchSavedMeals.mockResolvedValue([]);
  mocked.fetchMealTargets.mockResolvedValue(MEAL_TARGETS);
  mocked.logMeal.mockResolvedValue({});
});

describe("MenuPage quick add", () => {
  it("adds an item sold at one place right away", async () => {
    const props = renderMenu();
    await userEvent.click(within(await card(sandwich.name)).getByRole("button", { name: `Add ${sandwich.name} to today` }));
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith("Added to today"));
    expect(mocked.logMeal).toHaveBeenCalledWith(expect.objectContaining({ meal_id: sandwich.id, price: 7.45 }));
  });

  it("opens the details to pick a location when the item is sold at two places", async () => {
    const props = renderMenu();
    await userEvent.click(within(await card(subwaySub.name)).getByRole("button", { name: `Add ${subwaySub.name} to today` }));
    expect(props.onSelectMeal).toHaveBeenCalledWith(subwaySub);
    expect(mocked.logMeal).not.toHaveBeenCalled();
  });

  it("says a free sauce is free with a meal, on the card and in the toast", async () => {
    const props = renderMenu();
    const sauceCard = await card("Chick-fil-A Sauce");
    expect(within(sauceCard).getByText("Free with a meal")).toBeTruthy();
    await userEvent.click(within(sauceCard).getByRole("button", { name: "Add Chick-fil-A Sauce to today" }));
    await waitFor(() =>
      expect(props.onToast).toHaveBeenCalledWith("Added to today. Free with a meal, not counted toward spending."),
    );
  });

  it("tells the user in a toast when quick add fails, since the error banner may be scrolled away", async () => {
    mocked.logMeal.mockRejectedValueOnce(new Error("Can't reach the PolyProvision server. Try again."));
    const props = renderMenu();
    await userEvent.click(within(await card(sandwich.name)).getByRole("button", { name: `Add ${sandwich.name} to today` }));
    await waitFor(() =>
      expect(props.onToast).toHaveBeenCalledWith("Couldn't add to today: Can't reach the PolyProvision server. Try again."),
    );
    expect(within(await card(sandwich.name)).getByRole("button", { name: `Add ${sandwich.name} to today` })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("shows unknown nutrition on a card as unavailable, and rounds the rest", async () => {
    mocked.fetchMenu.mockResolvedValue({
      ...MENU,
      items: [{ ...sandwich, id: "mystery", name: "Mystery Wrap", calories: null, protein_g: 18.6 }, ...MENU.items],
    });
    renderMenu();
    const mystery = within(await card("Mystery Wrap"));
    expect(mystery.getByText("cal unavailable")).toBeTruthy();
    expect(mystery.getByText("19g protein")).toBeTruthy();
    expect(mystery.queryByText(/—/)).toBeNull();
  });

  it("opens a combo from Combos & Meals", async () => {
    const props = renderMenu();
    await userEvent.click(await screen.findByRole("button", { name: /Chick-fil-A Deluxe Sandwich Meal/ }));
    expect(props.onSelectCombo).toHaveBeenCalledWith(deluxeMeal);
  });
});
