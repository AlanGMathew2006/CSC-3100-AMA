import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MenuCombo } from "@csc-3100-ama/shared";
import * as api from "../../lib/api";
import { MENU, deluxeMeal, plate, tacoCombo } from "../../test/fixtures";
import { ComboDetailPage } from "./ComboDetailPage";

vi.mock("../../lib/api");
const mocked = vi.mocked(api);

function renderCombo(combo: MenuCombo) {
  const props = { onBack: vi.fn(), onNavigate: vi.fn(), onToast: vi.fn() };
  render(<ComboDetailPage combo={combo} {...props} />);
  return props;
}

const addButton = () => screen.getByRole("button", { name: /Add to Today|Adding…/ }) as HTMLButtonElement;
const nutrition = (label: string) => screen.getByText(label, { selector: ".detail-nutrition span" }).previousElementSibling!.textContent;

beforeEach(() => {
  mocked.fetchMenu.mockResolvedValue(MENU);
  mocked.logMeal.mockResolvedValue({});
});

describe("ComboDetailPage, build your own", () => {
  it("keeps Add to Today disabled until the base and every entree are picked", async () => {
    renderCombo(plate);
    const base = await screen.findByRole("combobox", { name: "Base" });
    await waitFor(() => expect(within(base).getAllByRole("option").length).toBeGreaterThan(1));
    expect(addButton().disabled).toBe(true);
    expect(screen.getByText("Choose a base and 2 entrees to see the totals.")).toBeTruthy();

    await userEvent.selectOptions(base, "px-chow-mein");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Entree 1" }), "px-orange");
    expect(addButton().disabled).toBe(true);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Entree 2" }), "px-broccoli");
    expect(addButton().disabled).toBe(false);
    expect(nutrition("Calories")).toBe("1230");
    expect(nutrition("Fat")).toBe("44g");
  });

  it("halves a half-and-half base and rounds the totals to whole numbers", async () => {
    const props = renderCombo(plate);
    const base = await screen.findByRole("combobox", { name: "Base" });
    await waitFor(() => expect(within(base).getAllByRole("option").length).toBeGreaterThan(1));
    await userEvent.selectOptions(base, "px-chow-mein");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Half and half (optional)" }), "px-fried-rice");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Entree 1" }), "px-orange");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Entree 2" }), "px-orange");
    // ½ Chow Mein + ½ Fried Rice: 6 + 6.5 fat, + 2 × 25 = 62.5 -> 63g.
    expect(nutrition("Fat")).toBe("63g");
    expect(nutrition("Protein")).toBe("53g");
    await userEvent.click(addButton());
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith("Added to today"));
    expect(mocked.logMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Plate: Chow Mein + Fried Rice + 2× The Original Orange Chicken",
        price: 11.3,
        fat_g: 62.5,
      }),
    );
  });
});

describe("ComboDetailPage, fixed contents", () => {
  it("lists a verified combo's parts and shows unknown totals as unavailable", async () => {
    renderCombo(deluxeMeal);
    const section = screen.getByRole("heading", { name: "What's in this combo" }).closest("section")!;
    expect(await within(section).findByText(/Chick-fil-A Deluxe Sandwich$/)).toBeTruthy();
    expect(within(section).getByText(/Side: Waffle Potato Fries \(Medium\)/)).toBeTruthy();
    expect(within(section).getByText(/Drink: Sweetened Iced Tea \(Medium\)/)).toBeTruthy();
    await waitFor(() => expect(nutrition("Calories")).toBe("1030"));
    expect(nutrition("Fat")).toBe("unavailable");
    expect(addButton().disabled).toBe(false);
  });

  it("says an unverified combo's contents are unverified, and logs it without nutrition", async () => {
    const props = renderCombo(tacoCombo);
    expect(screen.getByText("Contents unverified")).toBeTruthy();
    expect(screen.getByText("Exact contents not checked yet.")).toBeTruthy();
    expect(screen.queryByText("Calories", { selector: ".detail-nutrition span" })).toBeNull();
    await userEvent.click(addButton());
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith("Added to today"));
    expect(mocked.logMeal).toHaveBeenCalledWith({
      location_id: undefined,
      location_name: undefined,
      name: "3 Crunchy Taco Combo",
      price: 9.19,
      calories: undefined,
      protein_g: undefined,
      carbs_g: undefined,
      fat_g: undefined,
    });
  });

  it("shows a failed add next to the button", async () => {
    mocked.logMeal.mockRejectedValueOnce(new Error("Couldn't save the meal"));
    const props = renderCombo(tacoCombo);
    await userEvent.click(addButton());
    const alert = await screen.findByText("Couldn't save the meal");
    expect(alert.previousElementSibling?.classList.contains("detail-actions")).toBe(true);
    expect(addButton().disabled).toBe(false);
    expect(props.onBack).not.toHaveBeenCalled();
  });
});
