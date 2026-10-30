import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  comboAvailability,
  getMenu,
  latestOfferings
} from "./menu-service.js";

const loc = (id: string, name: string) => ({
  id,
  name,
  campus_area: null
});

test("latestOfferings keeps the newest available price per location", () => {
  const result = latestOfferings([
    {
      price: 5,
      service_date: "2026-10-01",
      available: true,
      location: loc("a", "Subway (A)")
    },
    {
      price: 6,
      service_date: "2026-10-05",
      available: true,
      location: loc("a", "Subway (A)")
    },
    {
      price: 9,
      service_date: "2026-10-09",
      available: false,
      location: loc("a", "Subway (A)")
    },
    {
      price: 7,
      service_date: "2026-10-05",
      available: true,
      location: loc("b", "Subway (B)")
    }
  ]);
  assert.deepEqual(
    result.map((o) => [o.location_name, o.price]),
    [
      ["Subway (A)", 6],
      ["Subway (B)", 7]
    ]
  );
});

// Wednesday 2026-10-28, 12:00 in Los Angeles (PDT, UTC-7).
const NOON_WED = new Date("2026-10-28T12:00:00-07:00");
const openAllWeek = (open: string, close: string) =>
  Object.fromEntries(
    ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((day) => [
      day,
      [{ open, close }]
    ])
  );
const OPEN = { ...loc("open", "Subway (Open)"), hours: openAllWeek("07:00", "20:00") };
const CLOSED = { ...loc("closed", "Taco Bell (Closed)"), hours: openAllWeek("18:00", "23:00") };
const UNKNOWN = { ...loc("unknown", "Panda Express (Unknown)"), hours: {} };
const offering = (location: typeof OPEN) => ({
  price: 5,
  service_date: "2026-10-05",
  available: true,
  location
});

test("latestOfferings marks each location open, closed, or unknown at the given time", () => {
  assert.deepEqual(
    latestOfferings(
      [offering(OPEN), offering(CLOSED), offering(UNKNOWN)],
      NOON_WED
    ).map((o) => [o.location_name, o.open_status]),
    [
      ["Panda Express (Unknown)", "unknown"],
      ["Subway (Open)", "open"],
      ["Taco Bell (Closed)", "closed"]
    ]
  );
});

// Minimal chainable stand-in for the queries getMenu makes.
function menuDb(meals: unknown[], locations: unknown[] = []) {
  const query = (data: unknown[]) => {
    const chain = {
      select: () => chain,
      not: () => chain,
      order: () => chain,
      then: (resolve: (value: unknown) => unknown) =>
        resolve({ data, error: null })
    };
    return chain;
  };
  return {
    from: (table: string) =>
      query(
        table === "meals"
          ? meals
          : table === "dining_locations"
            ? locations
            : []
      )
  } as unknown as SupabaseClient;
}

const meal = (id: string, offerings: unknown[]) => ({
  id,
  name: id,
  restaurant: "R",
  category: "C",
  serving: null,
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  meal_component: null,
  offerings
});

test("getMenu with openNow drops closed locations but keeps unknown hours and combo-only items", async () => {
  const db = menuDb([
    meal("both", [offering(OPEN), offering(CLOSED)]),
    meal("closed-only", [offering(CLOSED)]),
    meal("unknown-only", [offering(UNKNOWN)]),
    meal("combo-only", [])
  ]);

  const all = await getMenu(db, { at: NOON_WED });
  assert.equal(all.items.length, 4);

  const open = await getMenu(db, { openNow: true, at: NOON_WED });
  assert.deepEqual(
    open.items.map((item) => [
      item.id,
      item.offerings.map((o) => o.open_status)
    ]),
    [
      ["both", ["open"]],
      ["unknown-only", ["unknown"]],
      ["combo-only", []]
    ]
  );
});

const BREAKFAST = openAllWeek("00:00", "10:30");

test("offerings carry availability from location hours and the item's serving window", () => {
  const at = new Date("2026-10-28T13:00:00-07:00");
  assert.deepEqual(
    latestOfferings([offering(OPEN)], at, BREAKFAST).map((o) => [o.open_status, o.availability]),
    [["open", "not_now"]]
  );
  assert.deepEqual(
    latestOfferings([offering(OPEN)], at, "unknown").map((o) => o.availability),
    ["unknown"]
  );
  assert.deepEqual(
    latestOfferings([offering(OPEN)], at).map((o) => o.availability),
    ["available"]
  );
});

test("getMenu with openNow hides breakfast after its window and keeps unknown serving times", async () => {
  const at = new Date("2026-10-28T13:00:00-07:00");
  const db = menuDb([
    { ...meal("biscuit", [offering(OPEN)]), serving_windows: BREAKFAST },
    { ...meal("subway-egg", [offering(OPEN)]), serving_windows: "unknown" },
    { ...meal("sandwich", [offering(OPEN)]), serving_windows: null }
  ]);
  const open = await getMenu(db, { openNow: true, at });
  assert.deepEqual(
    open.items.map((item) => [item.id, item.offerings[0]?.availability]),
    [
      ["subway-egg", "unknown"],
      ["sandwich", "available"]
    ]
  );
});

test("comboAvailability checks the restaurant's locations and the combo's window", () => {
  const locations = [
    { id: "cfa", name: "Chick-fil-A (1901 Marketplace)", restaurant: "Chick-fil-A", campus_area: "1901 Marketplace", hours: openAllWeek("07:00", "21:00") }
  ];
  const breakfastMeal = { restaurant: "Chick-fil-A", serving_windows: BREAKFAST };
  assert.equal(comboAvailability(breakfastMeal, locations, new Date("2026-10-28T09:00:00-07:00")), "available");
  assert.equal(comboAvailability(breakfastMeal, locations, new Date("2026-10-28T13:00:00-07:00")), "not_now");
  assert.equal(
    comboAvailability({ restaurant: "Chick-fil-A", serving_windows: null }, locations, new Date("2026-10-28T13:00:00-07:00")),
    "available"
  );
  assert.equal(comboAvailability({ restaurant: "Nowhere", serving_windows: null }, locations, new Date()), "unknown");
});

// Real campus hours (data/dining_hours.json). 2026-11-04 is a Wednesday, 2026-11-07 a Saturday (PST).
const weekdays = (open: string, close: string) => ({
  mon: [{ open, close }], tue: [{ open, close }], wed: [{ open, close }],
  thu: [{ open, close }], fri: [{ open, close }]
});
const MARKETPLACE = [
  {
    id: "loc-cfa",
    name: "Chick-fil-A (1901 Marketplace)",
    restaurant: "Chick-fil-A",
    campus_area: "1901 Marketplace",
    hours: { ...weekdays("07:00", "21:00"), sat: [{ open: "11:00", close: "21:00" }], sun: [] }
  },
  {
    id: "loc-panda",
    name: "Panda Express (1901 Marketplace)",
    restaurant: "Panda Express",
    campus_area: "1901 Marketplace",
    hours: { ...weekdays("10:30", "21:00"), sat: [], sun: [{ open: "11:00", close: "21:00" }] }
  }
];
const unpricedBiscuit = {
  ...meal("cfa-chicken-egg-cheese-biscuit", []),
  restaurant: "Chick-fil-A",
  category: "Breakfast",
  serving_windows: BREAKFAST
};
const comboOnlyEntree = {
  ...meal("px-orange-chicken", []),
  restaurant: "Panda Express",
  category: "Entrees",
  meal_component: "entree"
};
const WED_1PM = new Date("2026-11-04T13:00:00-08:00");
const SAT_1PM = new Date("2026-11-07T13:00:00-08:00");

test("an unpriced Chick-fil-A breakfast item uses its restaurant's location and is not served at 13:00", async () => {
  const db = menuDb([unpricedBiscuit, comboOnlyEntree], MARKETPLACE);
  const all = await getMenu(db, { at: WED_1PM });
  const biscuit = all.items.find((i) => i.id === "cfa-chicken-egg-cheese-biscuit");
  assert.equal(biscuit?.availability, "not_now");
  assert.deepEqual(biscuit?.offerings, []);
  assert.deepEqual(biscuit?.restaurant_locations, [
    {
      location_id: "loc-cfa",
      location_name: "Chick-fil-A (1901 Marketplace)",
      campus_area: "1901 Marketplace",
      open_status: "open",
      availability: "not_now"
    }
  ]);

  const open = await getMenu(db, { at: WED_1PM, openNow: true });
  assert.deepEqual(open.items.map((i) => i.id), ["px-orange-chicken"]);
});

test("a Panda combo-only entree is available on a weekday afternoon and still has no price", async () => {
  const db = menuDb([comboOnlyEntree], MARKETPLACE);
  const [entree] = (await getMenu(db, { at: WED_1PM, openNow: true })).items;
  assert.equal(entree?.availability, "available");
  assert.deepEqual(entree?.offerings, []); // shown as "Price unavailable" / used in combos
  assert.equal(entree?.meal_component, "entree");
  assert.equal(entree?.restaurant_locations?.[0]?.campus_area, "1901 Marketplace");
  assert.equal(entree?.restaurant_locations?.[0]?.open_status, "open");
});

test("Panda items are not served on Saturday, when Panda is closed", async () => {
  const db = menuDb([comboOnlyEntree], MARKETPLACE);
  const [entree] = (await getMenu(db, { at: SAT_1PM })).items;
  assert.equal(entree?.availability, "not_now");
  assert.equal(entree?.restaurant_locations?.[0]?.open_status, "closed");
  assert.deepEqual((await getMenu(db, { at: SAT_1PM, openNow: true })).items, []);
});

test("an item with no known location still honors a closed serving window", async () => {
  const db = menuDb([{ ...unpricedBiscuit, restaurant: "Nowhere" }], []);
  const [biscuit] = (await getMenu(db, { at: WED_1PM })).items;
  assert.equal(biscuit?.availability, "not_now");
  assert.deepEqual(biscuit?.restaurant_locations, []);
});
