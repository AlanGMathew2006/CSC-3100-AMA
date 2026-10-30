import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMenu, latestOfferings } from "./menu-service.js";

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

// Minimal chainable stand-in for the two queries getMenu makes.
function menuDb(meals: unknown[]) {
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
    from: (table: string) => query(table === "meals" ? meals : [])
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
