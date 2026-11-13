import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { MenuCombo, MenuItem, MenuOffering } from "@csc-3100-ama/shared";
import {
  comboLog,
  comboLogName,
  defaultLogLocation,
  logLocations,
  mealLogFromItem,
  priceText,
  submitMealLog,
  unpricedLogNote,
} from "./mealLog";

// Mock data only.
const offering = (id: string, price: number, availability: MenuOffering["availability"] = "available"): MenuOffering => ({
  location_id: id,
  location_name: `Subway (${id})`,
  campus_area: id,
  price,
  service_date: "2026-10-05",
  open_status: availability === "available" ? "open" : "closed",
  availability,
});

const meal = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: "turkey",
  name: "Oven Roasted Turkey",
  restaurant: "Subway",
  category: "Subs",
  serving: null,
  calories: 280,
  protein_g: 18,
  carbs_g: 46,
  fat_g: 3.5,
  meal_component: null,
  offerings: [offering("pcv", 8.29)],
  ...overrides,
});

describe("mealLogFromItem", () => {
  it("logs a single-location item with that location's price and every macro", () => {
    assert.deepEqual(mealLogFromItem(meal(), "pcv"), {
      meal_id: "turkey",
      location_id: "pcv",
      name: "Oven Roasted Turkey",
      location_name: "Subway (pcv)",
      price: 8.29,
      calories: 280,
      protein_g: 18,
      carbs_g: 46,
      fat_g: 3.5,
    });
  });

  it("uses the chosen location's price when the item is sold at several", () => {
    const item = meal({ offerings: [offering("kennedy", 8.79), offering("pcv", 8.29)] });
    assert.equal(mealLogFromItem(item, "kennedy").price, 8.79);
    assert.equal(mealLogFromItem(item, "kennedy").location_name, "Subway (kennedy)");
    assert.equal(mealLogFromItem(item, "pcv").price, 8.29);
  });

  it("logs an unpriced item at its restaurant's location with no price", () => {
    const item = meal({
      offerings: [],
      restaurant_locations: [
        { location_id: "1901", location_name: "Panda Express (1901 Marketplace)", campus_area: "1901 Marketplace", open_status: "open", availability: "available" },
      ],
    });
    const log = mealLogFromItem(item, "1901");
    assert.equal(log.location_id, "1901");
    assert.equal(log.price, undefined);
    assert.ok(!("price" in log && log.price === 0));
  });

  it("leaves unknown macros undefined instead of 0", () => {
    const log = mealLogFromItem(meal({ protein_g: null, fat_g: null }), "pcv");
    assert.equal(log.protein_g, undefined);
    assert.equal(log.fat_g, undefined);
    assert.equal(log.calories, 280);
  });
});

describe("logLocations and defaultLogLocation", () => {
  it("defaults to a location that is serving the item now", () => {
    const item = meal({ offerings: [offering("kennedy", 8.79, "not_now"), offering("pcv", 8.29)] });
    assert.equal(logLocations(item).length, 2);
    assert.equal(defaultLogLocation(logLocations(item))?.location_id, "pcv");
  });
  it("falls back to the first location when none is open, and null with none", () => {
    const item = meal({ offerings: [offering("kennedy", 8.79, "not_now"), offering("pcv", 8.29, "not_now")] });
    assert.equal(defaultLogLocation(logLocations(item))?.location_id, "kennedy");
    assert.equal(defaultLogLocation([]), null);
  });
});

const part = (id: string, name: string, macros: [number, number, number | null, number]): MenuItem =>
  meal({ id, name, calories: macros[0], protein_g: macros[1], carbs_g: macros[2], fat_g: macros[3], offerings: [] });

const plate: MenuCombo = {
  id: "plate",
  restaurant: "Panda Express",
  name: "Plate",
  description: "1 base + 2 entrees",
  base_count: 1,
  entree_count: 2,
  price: 11.3,
  locations: [
    { location_id: "1901", location_name: "Panda Express (1901 Marketplace)", campus_area: "1901 Marketplace", open_status: "open", availability: "available" },
  ],
};

describe("comboLog", () => {
  const chowMein = part("chow-mein", "Chow Mein", [520, 14, 89, 12]);
  const friedRice = part("fried-rice", "Fried Rice", [610, 15, 109, 13]);
  const orange = part("orange", "Orange Chicken", [560, 19, 63, 25]);
  const broccoli = part("broccoli", "Broccoli Beef", [190, 17, 14, 7]);

  it("names the plate after its parts and sums their macros at the combo price", () => {
    const log = comboLog(plate, [
      { item: chowMein, servings: 1 },
      { item: orange, servings: 1 },
      { item: broccoli, servings: 1 },
    ]);
    assert.equal(log.name, "Plate: Chow Mein + Orange Chicken + Broccoli Beef");
    assert.equal(log.price, 11.3);
    assert.equal(log.location_id, "1901");
    assert.equal(log.meal_id, undefined);
    assert.deepEqual(
      [log.calories, log.protein_g, log.carbs_g, log.fat_g],
      [1270, 50, 166, 44],
    );
  });

  it("counts half-and-half bases as half a serving each and merges a doubled entree", () => {
    const picks = [
      { item: chowMein, servings: 0.5 },
      { item: friedRice, servings: 0.5 },
      { item: orange, servings: 1 },
      { item: orange, servings: 1 },
    ];
    assert.equal(comboLogName("Plate", picks), "Plate: Chow Mein + Fried Rice + 2× Orange Chicken");
    const log = comboLog(plate, picks);
    assert.equal(log.calories, 565 + 1120);
    assert.equal(log.carbs_g, 99 + 126);
  });

  it("leaves a macro out when any part's value is unknown", () => {
    const log = comboLog(plate, [
      { item: chowMein, servings: 1 },
      { item: part("mystery", "Mystery", [100, 5, null, 1]), servings: 2 },
    ]);
    assert.equal(log.carbs_g, undefined);
    assert.equal(log.calories, 720);
  });

  it("logs only the name and price when the contents are unknown", () => {
    const log = comboLog({ ...plate, name: "3 Crunchy Taco Combo" }, null);
    assert.equal(log.name, "3 Crunchy Taco Combo");
    assert.equal(log.price, 11.3);
    assert.equal(log.calories, undefined);
  });
});

describe("submitMealLog", () => {
  it("returns null when the log is saved", async () => {
    const sent: unknown[] = [];
    assert.equal(await submitMealLog({ name: "x" }, async (m) => sent.push(m)), null);
    assert.equal(sent.length, 1);
  });
  it("returns the error message when saving fails", async () => {
    const failure = await submitMealLog({ name: "x" }, async () => {
      throw new Error("Can't reach the PolyProvision server. Try again.");
    });
    assert.equal(failure, "Can't reach the PolyProvision server. Try again.");
  });
});

describe("priceText / unpricedLogNote", () => {
  it("shows the price, Free with a meal, or Price unavailable (never $0.00 for unknown)", () => {
    assert.equal(priceText({}, 8.5), "$8.50");
    assert.equal(priceText({ free_with_meal: true }, null), "Free with a meal");
    assert.equal(priceText({ free_with_meal: false }, null), "Price unavailable");
    assert.equal(priceText({}, undefined), "Price unavailable");
    // A real price always wins, even on a free-with-meal item.
    assert.equal(priceText({ free_with_meal: true }, 0.5), "$0.50");
    // Panda bases and entrees are priced through a Bowl or Plate.
    assert.equal(priceText({ meal_component: "entree" }, null), "Combo only");
  });

  it("explains why an unpriced log doesn't count toward spending", () => {
    assert.equal(unpricedLogNote({ free_with_meal: true }), "Free with a meal, not counted toward spending");
    assert.equal(unpricedLogNote({}), "Price unavailable, not counted toward spending");
  });
});
