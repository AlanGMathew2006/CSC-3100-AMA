// Click-through of data/SPRINT4_NOTES.md section 5 with a stubbed API (MOCK data, see stubs.ts).
// Screenshots go to test-results/screenshots (git-ignored) for review at phone and desktop width.
import { expect, test, type Page } from "@playwright/test";
import { stubBackend, type Backend } from "./stubs";

let backend: Backend;

test.beforeEach(async ({ page }) => {
  backend = await stubBackend(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What should I eat next?" })).toBeVisible();
});

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/screenshots/${test.info().project.name}-${name}.png`, fullPage: true });
const nav = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name });
const toast = (page: Page) => page.locator(".toast-message");

test("dashboard recommendations and the recommended meal", async ({ page }) => {
  await shot(page, "01-dashboard");
  const hero = page.locator(".recommend-card");
  await expect(hero.getByText("$12.45")).toBeVisible();
  await expect(hero.getByText(/^Macro Match \d+$/)).toBeVisible();
  await expect(hero.getByText(/^Includes: Chick-fil-A Deluxe Sandwich \+ Waffle Potato Fries/)).toBeVisible();
  // Step 6: dashboard cards have no "+".
  await expect(page.getByRole("button", { name: /^Add .* to today$/ })).toHaveCount(0);

  // Step 14: the recommended meal.
  await hero.getByRole("button", { name: "View Meal" }).click();
  await expect(page.getByText("Chick-fil-A Deluxe Sandwich Meal combo, $12.45")).toBeVisible();
  await expect(page.locator(".detail-alternative-card").getByText("in combo")).toHaveCount(3);
  await expect(page.getByText("Allergen info incomplete")).toBeVisible();
  await expect(page.getByText("Contains at least: Milk, Egg, Wheat, Soy, Sesame")).toBeVisible();
  await shot(page, "02-recommendation-detail");
  await page.getByRole("button", { name: "Add to Today" }).click();
  await expect(toast(page)).toHaveText("Meal added to today");
  expect(backend.logs.at(-1)).toMatchObject({ price: 12.45, location_name: "Chick-fil-A (1901 Marketplace)" });

  // The #1 Plate lists its half bases.
  await page.locator(".recommend-options").getByRole("button", { name: /#1 Plate/ }).click();
  const plateItems = page.locator(".detail-alternative-card");
  await expect(plateItems.getByText("½ Fried Rice")).toBeVisible();
  await expect(plateItems.filter({ hasText: "½ Fried Rice" })).toContainText("305 cal · 8g protein · 55g carbs · 7g fat");
  await shot(page, "03-plate-detail");
});

test("Explore quick add, location picker and unpriced items", async ({ page }) => {
  await nav(page, "Explore").click();
  await expect(page.getByRole("heading", { name: "Explore Meals" })).toBeVisible();
  await shot(page, "04-explore");

  // Step 1: one location, added right away; the dashboard shows it.
  await page.getByRole("button", { name: "Add Chick-fil-A Deluxe Sandwich to today" }).click();
  await expect(toast(page)).toHaveText("Added to today");
  expect(backend.logs.at(-1)).toMatchObject({ name: "Chick-fil-A Deluxe Sandwich", price: 7.45 });

  // Step 2: two locations open the details with a picker defaulting to the open one.
  await page.getByRole("button", { name: "Add Oven-Roasted Turkey to today" }).click();
  const picker = page.getByRole("combobox", { name: "Where are you eating it?" });
  await expect(picker).toHaveValue("loc-sub-pcv");
  await picker.selectOption("loc-sub-lib");
  await shot(page, "05-meal-detail-picker");
  await page.getByRole("button", { name: "Add to Today" }).click();
  await expect(toast(page)).toHaveText("Added to today");
  expect(backend.logs.at(-1)).toMatchObject({ location_id: "loc-sub-lib", price: 8.29 });

  // Step 4: Save meal toggles; Back works.
  await page.getByRole("button", { name: "Save meal", exact: true }).first().click();
  await expect(toast(page)).toHaveText("Meal saved to your plans");
  await page.getByRole("button", { name: "Meal Details" }).click();
  await expect(page.getByRole("heading", { name: "Explore Meals" })).toBeVisible();

  // Step 3: a free sauce says so and is logged without a price.
  await page.getByRole("button", { name: /Chick-fil-A Sauce/ }).first().click();
  await expect(page.getByText("Free with a meal, not counted toward spending")).toBeVisible();
  await shot(page, "06-meal-detail-free");
  await page.getByRole("button", { name: "Add to Today" }).click();
  await expect(toast(page)).toHaveText("Added to today");
  expect(backend.logs.at(-1)?.price).toBeUndefined();

  // Step 7: a failed add shows an error and the button comes back.
  backend.failNextLog = true;
  await page.getByRole("button", { name: "Add to Today" }).click();
  await expect(page.getByRole("alert")).toHaveText("Couldn't save the meal (stubbed failure)");
  await expect(page.getByRole("button", { name: "Add to Today" })).toBeEnabled();
  await shot(page, "07-meal-detail-error");

  // The dashboard picks up the logs (spending counts only priced items).
  await nav(page, "Home").click();
  await expect(page.getByText("$15.74 of $25.00 target spent today")).toBeVisible();
});

test("Combos & Meals: build-your-own, verified and unverified", async ({ page }) => {
  await nav(page, "Explore").click();

  // Step 8: Plate stays disabled until base and both entrees are picked.
  await page.getByRole("button", { name: /^Panda Express.*Plate/ }).click();
  const add = page.getByRole("button", { name: "Add to Today" });
  await expect(add).toBeDisabled();
  await page.getByRole("combobox", { name: "Base" }).selectOption("px-chow-mein");
  await page.getByRole("combobox", { name: "Entree 1" }).selectOption("px-orange");
  await expect(add).toBeDisabled();
  await page.getByRole("combobox", { name: "Entree 2" }).selectOption("px-broccoli");
  await expect(add).toBeEnabled();
  await expect(page.locator(".detail-nutrition").first()).toContainText("1230");
  await shot(page, "08-combo-plate");
  await add.click();
  await expect(toast(page)).toHaveText("Added to today");
  expect(backend.logs.at(-1)).toMatchObject({ name: "Plate: Chow Mein + The Original Orange Chicken + Broccoli Beef", price: 11.3 });

  // Step 11: a verified Chick-fil-A meal lists its side and drink.
  await page.getByRole("button", { name: /Chick-fil-A Deluxe Sandwich Meal/ }).click();
  await expect(page.getByText("Side: Waffle Potato Fries (Medium)")).toBeVisible();
  await expect(page.getByText("Drink: Sweetened Iced Tea (Medium)")).toBeVisible();
  await shot(page, "09-combo-verified");
  await page.getByRole("button", { name: "Combo Details" }).click();

  // Step 12: an unverified combo says so.
  await page.getByRole("button", { name: /3 Crunchy Taco Combo/ }).click();
  await expect(page.getByText("Contents unverified")).toBeVisible();
  await shot(page, "10-combo-unverified");
});
