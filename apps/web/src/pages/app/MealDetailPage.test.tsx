import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MenuItem } from "@csc-3100-ama/shared";
import * as api from "../../lib/api";
import { MEAL_TARGETS, MENU, sandwich, sauce, subwaySub, tea } from "../../test/fixtures";
import { MealDetailPage } from "./MealDetailPage";

vi.mock("../../lib/api");
const mocked = vi.mocked(api);

function renderMeal(item: MenuItem) {
  const props = { onBack: vi.fn(), onSelectMeal: vi.fn(), onNavigate: vi.fn(), onToast: vi.fn() };
  render(<MealDetailPage item={item} {...props} />);
  return props;
}

beforeEach(() => {
  mocked.fetchMenu.mockResolvedValue(MENU);
  mocked.fetchSavedMeals.mockResolvedValue([]);
  mocked.fetchMealTargets.mockResolvedValue(MEAL_TARGETS);
  mocked.logMeal.mockResolvedValue({});
});

describe("MealDetailPage", () => {
  it("adds an item sold at one place at that place's price", async () => {
    const props = renderMeal(sandwich);
    expect(screen.queryByRole("combobox")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Add to Today" }));
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith("Added to today"));
    expect(mocked.logMeal).toHaveBeenCalledWith(
      expect.objectContaining({ meal_id: sandwich.id, location_id: "loc-cfa", price: 7.45, calories: 490 }),
    );
  });

  it("picks where to log an item sold at two places, defaulting to one serving it now", async () => {
    const props = renderMeal(subwaySub);
    const picker = screen.getByRole("combobox", { name: "Where are you eating it?" }) as HTMLSelectElement;
    expect(picker.value).toBe("loc-sub-pcv");
    expect(within(picker).getByRole("option", { name: "Kennedy Library · $8.29 · not served now" })).toBeTruthy();
    await userEvent.selectOptions(picker, "loc-sub-lib");
    await userEvent.click(screen.getByRole("button", { name: "Add to Today" }));
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith("Added to today"));
    expect(mocked.logMeal).toHaveBeenCalledWith(expect.objectContaining({ location_id: "loc-sub-lib", price: 8.29 }));
  });

  it("says an unpriced item isn't counted toward spending, and logs it without a price", async () => {
    const unpriced: MenuItem = { ...sauce, free_with_meal: false };
    const props = renderMeal(unpriced);
    expect(screen.getByText("Price unavailable, not counted toward spending")).toBeTruthy();
    expect(screen.getAllByText("Price unavailable").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Add to Today" }));
    await waitFor(() => expect(props.onToast).toHaveBeenCalled());
    expect(mocked.logMeal.mock.calls[0]?.[0].price).toBeUndefined();
  });

  it("shows 'Free with a meal' for sauces instead of a price", () => {
    renderMeal(sauce);
    expect(screen.getByText("Free with a meal, not counted toward spending")).toBeTruthy();
    expect(screen.getByText("Free with a meal")).toBeTruthy();
    expect(screen.getByText("Free with a meal, not sold on its own.")).toBeTruthy();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("shows unknown nutrition as unavailable, never as a dash or 0", () => {
    renderMeal(tea);
    const fat = screen.getByText("Fat").closest<HTMLElement>(".detail-nutrition")!;
    expect(within(fat).getByText("unavailable")).toBeTruthy();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("shows a failed add next to the button and re-enables it", async () => {
    mocked.logMeal.mockRejectedValueOnce(new Error("Couldn't save the meal"));
    renderMeal(sandwich);
    await userEvent.click(screen.getByRole("button", { name: "Add to Today" }));
    const alert = await screen.findByText("Couldn't save the meal");
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.closest(".detail-body")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Add to Today" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
