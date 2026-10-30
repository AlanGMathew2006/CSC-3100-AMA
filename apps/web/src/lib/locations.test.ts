import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MenuItem } from "@csc-3100-ama/shared";
import { listedLocation } from "./locations";

// Mock data only.
const base: MenuItem = {
  id: "cfa-biscuit",
  name: "Chicken, Egg & Cheese Biscuit",
  restaurant: "Chick-fil-A",
  category: "Breakfast",
  serving: null,
  calories: 420,
  protein_g: 19,
  carbs_g: 39,
  fat_g: 21,
  meal_component: null,
  offerings: [],
};

describe("listedLocation", () => {
  it("uses the cheapest offering when the item has a price", () => {
    const item: MenuItem = {
      ...base,
      offerings: [
        { location_id: "a", location_name: "Subway (Kennedy Library)", campus_area: "Kennedy Library", price: 9, service_date: "", open_status: "open", availability: "available" },
        { location_id: "b", location_name: "Subway (Poly Canyon Village)", campus_area: "Poly Canyon Village", price: 8, service_date: "", open_status: "closed", availability: "not_now" },
      ],
    };
    assert.deepEqual(listedLocation(item), { label: "Poly Canyon Village", open_status: "closed", availability: "not_now" });
  });

  it("falls back to the restaurant's location for an unpriced item", () => {
    const item: MenuItem = {
      ...base,
      availability: "not_now",
      restaurant_locations: [
        { location_id: "cfa", location_name: "Chick-fil-A (1901 Marketplace)", campus_area: "1901 Marketplace", open_status: "open", availability: "not_now" },
      ],
    };
    assert.deepEqual(listedLocation(item), { label: "1901 Marketplace", open_status: "open", availability: "not_now" });
  });

  it("uses the restaurant name only when no location is known", () => {
    assert.deepEqual(listedLocation(base), { label: "Chick-fil-A", open_status: null, availability: null });
  });
});
