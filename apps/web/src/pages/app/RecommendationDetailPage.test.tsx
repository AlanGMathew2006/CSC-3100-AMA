import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Recommendation } from "@csc-3100-ama/shared";
import * as api from "../../lib/api";
import { MENU, comboRecommendation, fries, plateRecommendation, sandwich, subRecommendation, tea } from "../../test/fixtures";
import { RecommendationDetailPage } from "./RecommendationDetailPage";

vi.mock("../../lib/api");
const mocked = vi.mocked(api);

function renderDetail(rec: Recommendation) {
  const props = { onBack: vi.fn(), onSelectMeal: vi.fn(), onNavigate: vi.fn(), onToast: vi.fn() };
  render(<RecommendationDetailPage rec={rec} {...props} />);
  return props;
}

const itemsSection = () => screen.getByRole("heading", { name: "What's in this meal" }).closest("section")!;

beforeEach(() => {
  mocked.fetchMenu.mockResolvedValue(MENU);
  mocked.logMeal.mockResolvedValue({});
});

describe("RecommendationDetailPage", () => {
  it("lists a combo's parts as 'in combo' with the combo price line", async () => {
    renderDetail(comboRecommendation);
    // The combo's name is the heading; its parts are listed below it.
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Chick-fil-A Deluxe Sandwich Meal");
    expect(screen.getByText("Chick-fil-A Deluxe Sandwich Meal combo, $12.45")).toBeTruthy();
    const rows = within(itemsSection()).getAllByRole("button");
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(within(row).getByText("in combo")).toBeTruthy();
    // Unknown nutrition says so instead of 0.
    await waitFor(() =>
      expect(within(itemsSection()).getByText("120 cal · 0g protein · 31g carbs · fat unavailable")).toBeTruthy(),
    );
  });

  it("says nutrition is loading (not unavailable) while the menu loads", async () => {
    mocked.fetchMenu.mockReturnValue(new Promise(() => {}));
    renderDetail(comboRecommendation);
    expect(within(itemsSection()).getAllByText("Loading nutrition…")).toHaveLength(3);
    expect(within(itemsSection()).queryByText(/unavailable/)).toBeNull();
  });

  it("marks half servings with ½ and scales their nutrition", async () => {
    renderDetail(plateRecommendation);
    const section = itemsSection();
    await waitFor(() => expect(within(section).getByText("½ Fried Rice")).toBeTruthy());
    expect(within(section).getByText("305 cal · 8g protein · 55g carbs · 7g fat")).toBeTruthy();
    expect(within(section).getByText("½ Chow Mein")).toBeTruthy();
  });

  it("shows standalone prices, 'each' for more than one", async () => {
    renderDetail(subRecommendation);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("2× Oven-Roasted Turkey");
    await waitFor(() => expect(within(itemsSection()).getByText("$8.49 each")).toBeTruthy());
    expect(within(itemsSection()).getByText("2× Oven-Roasted Turkey")).toBeTruthy();
  });

  it("says allergen info is incomplete when an item isn't verified, and lists what is known", async () => {
    renderDetail(comboRecommendation);
    const section = screen.getByRole("heading", { name: "Allergens" }).closest("section")!;
    await waitFor(() => expect(within(section).getByText("Allergen info incomplete")).toBeTruthy());
    expect(await within(section).findByText("Contains at least: Milk, Egg, Wheat, Soy, Sesame")).toBeTruthy();
  });

  it("lists every allergen when all items are verified", async () => {
    mocked.fetchMenu.mockResolvedValue({ ...MENU, items: MENU.items.map((i) => (i.id === tea.id ? { ...i, allergens_verified: true } : i)) });
    renderDetail(comboRecommendation);
    const section = screen.getByRole("heading", { name: "Allergens" }).closest("section")!;
    expect(await within(section).findByText("Contains: Milk, Egg, Wheat, Soy, Sesame")).toBeTruthy();
    expect(within(section).queryByText("Allergen info incomplete")).toBeNull();
  });

  it("opens an item's details", async () => {
    const props = renderDetail(comboRecommendation);
    const row = await within(itemsSection()).findByRole("button", { name: /Waffle Potato Fries/ });
    await waitFor(() => expect((row as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(row);
    expect(props.onSelectMeal).toHaveBeenCalledWith(fries);
    expect(sandwich.id).toBe(comboRecommendation.items[0]!.meal_id);
  });

  it("adds the whole meal to today, then goes back", async () => {
    const props = renderDetail(comboRecommendation);
    await userEvent.click(screen.getByRole("button", { name: "Add to Today" }));
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith("Meal added to today"));
    expect(props.onBack).toHaveBeenCalled();
    expect(mocked.logMeal).toHaveBeenCalledWith(expect.objectContaining({ price: 12.45, location_name: "Chick-fil-A (1901 Marketplace)" }));
  });

  it("shows a failed add next to the button, and the button works again", async () => {
    let fail: (error: Error) => void = () => {};
    mocked.logMeal.mockReturnValueOnce(new Promise((_, reject) => (fail = reject)));
    const props = renderDetail(comboRecommendation);
    const button = screen.getByRole("button", { name: "Add to Today" }) as HTMLButtonElement;
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "Adding…" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Adding…" }) as HTMLButtonElement).disabled).toBe(true);
    fail(new Error("Can't reach the PolyProvision server. Try again."));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Can't reach the PolyProvision server. Try again.");
    // The message sits with the actions, where the user just tapped.
    expect(alert.previousElementSibling?.classList.contains("detail-actions")).toBe(true);
    expect((screen.getByRole("button", { name: "Add to Today" }) as HTMLButtonElement).disabled).toBe(false);
    expect(props.onBack).not.toHaveBeenCalled();
  });
});
