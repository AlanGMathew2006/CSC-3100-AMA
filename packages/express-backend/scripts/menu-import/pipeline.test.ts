import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { load } from "./load.js";
import {
  applyServingWindows,
  buildImportPlan,
  parseCsv,
  splitCampusAreas,
  toComboRecords,
  toHoursRecords,
  toItemRecords,
  toServingWindowRules
} from "./pipeline.js";

const HEADER =
  "id,restaurant,campus_location,category,item_name,serving,price_usd,calories,campus_listed_calories,protein_g,carbs_g,fat_g,meal_component,campus_menu_verified,price_source,nutrition_source,collected_on,notes";

test("parseCsv handles quoted commas, escaped quotes and CRLF", () => {
  const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n\r\n');
  assert.deepEqual(rows, [{ a: "x, y", b: 'say "hi"' }]);
});

test("splitCampusAreas splits on ; and drops building notes", () => {
  assert.deepEqual(
    splitCampusAreas(
      "Poly Canyon Village; Kennedy Library (Dexter Bldg)"
    ),
    ["Poly Canyon Village", "Kennedy Library"]
  );
});

test("toItemRecords cleans numbers and flags bad rows", () => {
  const csv = [
    HEADER,
    "tb--bean,Taco Bell,Poly Canyon Village,Burritos,Bean Burrito,1 burrito,2.69,360,370,13,54,10,,yes,src,nut,2026-10-05,",
    "px--rice,Panda Express,1901 Marketplace,Bases,Fried Rice,1 serving,,520,,11,85,16,base,yes,,nut,2026-10-05,",
    "bad--price,Subway,Poly Canyon Village,Subs,Bad,1,abc,1,,1,1,1,,yes,,,2026-10-05,",
    "tb--bean,Taco Bell,Poly Canyon Village,Burritos,Dup,1,1,1,,1,1,1,,yes,,,2026-10-05,"
  ].join("\n");
  const { items, problems } = toItemRecords(parseCsv(csv));

  assert.equal(items.length, 2);
  assert.equal(items[0]?.price, 2.69);
  assert.equal(items[1]?.price, null);
  assert.equal(items[1]?.mealComponent, "base");
  assert.deepEqual(
    problems.map((p) => p.message),
    ["price is not a non-negative number", "duplicate id"]
  );
});

test("buildImportPlan makes one location per restaurant per area and skips unpriced offerings", () => {
  const csv = [
    HEADER,
    'sw--club,Subway,"Poly Canyon Village; Kennedy Library (Dexter Bldg)",6-inch Subs,Club,6 inch,9.99,310,,23,40,6,,yes,src,nut,2026-10-05,',
    "px--rice,Panda Express,1901 Marketplace,Bases,Fried Rice,1 serving,,520,,11,85,16,base,yes,,nut,2026-10-05,"
  ].join("\n");
  const { items } = toItemRecords(parseCsv(csv));
  const plan = buildImportPlan(items, []);

  assert.deepEqual(
    plan.locations.map((l) => l.name),
    [
      "Subway (Poly Canyon Village)",
      "Subway (Kennedy Library)",
      "Panda Express (1901 Marketplace)"
    ]
  );
  assert.equal(plan.meals.length, 2);
  assert.equal(plan.offerings.length, 2); // the sub at both Subways, nothing for the rice
  assert.equal(plan.unpricedMeals, 1);
});

const ALLERGEN_HEADER = `${HEADER},allergens,tags,allergens_verified,allergen_source`;
const allergenRow = (id: string, tail: string) =>
  `${id},Chick-fil-A,1901 Marketplace,Breakfast,${id},1,5.29,1,,1,1,1,,yes,,,2026-10-05,,${tail}`;

test("toItemRecords reads allergens, tags and allergens_verified", () => {
  const csv = [
    ALLERGEN_HEADER,
    allergenRow("cfa--bacon", "milk|Egg|wheat|egg,contains_pork,yes,chick-fil-a.com"),
    allergenRow("cfa--unknown", ",,no,"),
    allergenRow("cfa--blank", ",,,"),
    allergenRow("bad--allergen", "milk|mustard,,yes,src"),
    allergenRow("bad--tag", ",keto,yes,src"),
    allergenRow("bad--flag", ",,maybe,"),
    allergenRow("bad--source", "milk,,yes,"),
    allergenRow("bad--unverified", "milk,,no,")
  ].join("\n");
  const { items, problems } = toItemRecords(parseCsv(csv));

  assert.deepEqual(
    items.map((i) => [
      i.sourceId,
      i.allergens,
      i.tags,
      i.allergensVerified
    ]),
    [
      ["cfa--bacon", ["milk", "egg", "wheat"], ["contains_pork"], true],
      ["cfa--unknown", [], [], false],
      ["cfa--blank", [], [], false]
    ]
  );
  assert.deepEqual(
    problems.map((p) => p.message),
    [
      'unknown allergen "mustard"',
      'unknown tag "keto"',
      "allergens_verified must be yes or no",
      "allergen_source is required when allergens_verified is yes",
      "allergens/tags are set but allergens_verified is not yes"
    ]
  );

  const plan = buildImportPlan(items, []);
  assert.deepEqual(plan.meals[0], {
    ...plan.meals[0],
    allergens: ["milk", "egg", "wheat"],
    tags: ["contains_pork"],
    allergens_verified: true,
    allergen_source: "chick-fil-a.com"
  });
  assert.equal(plan.meals[1]?.allergens_verified, false);
});

const WEEK = {
  mon: [{ open: "07:00", close: "20:00" }],
  tue: [{ open: "07:00", close: "20:00" }],
  wed: [{ open: "07:00", close: "20:00" }],
  thu: [{ open: "07:00", close: "20:00" }],
  fri: [
    { open: "07:00", close: "10:30" },
    { open: "11:00", close: "01:00" }
  ],
  sat: [],
  sun: []
};

test("toHoursRecords keeps valid and null hours and flags bad entries", () => {
  const { hours, problems } = toHoursRecords({
    locations: [
      {
        name: "Subway (Poly Canyon Village)",
        hours: WEEK,
        source: "Grubhub campus app",
        collected_on: "2026-10-30"
      },
      { name: "Taco Bell (Poly Canyon Village)", hours: null },
      {
        name: "Bad (Days)",
        hours: { mon: [] },
        source: "x",
        collected_on: "2026-10-30"
      },
      {
        name: "Bad (Time)",
        hours: { ...WEEK, mon: [{ open: "7am", close: "20:00" }] },
        source: "x",
        collected_on: "2026-10-30"
      },
      { name: "Bad (Source)", hours: WEEK, collected_on: "2026-10-30" },
      { name: "Taco Bell (Poly Canyon Village)", hours: null }
    ]
  });

  assert.deepEqual(
    hours.map((h) => [h.locationName, h.hours === null]),
    [
      ["Subway (Poly Canyon Village)", false],
      ["Taco Bell (Poly Canyon Village)", true]
    ]
  );
  assert.equal(hours[0]?.collectedOn, "2026-10-30");
  assert.deepEqual(
    problems.map((p) => p.message),
    [
      "sun is missing (use [] for a closed day)",
      "mon has a window without valid HH:MM open/close times",
      "source is required when hours are set",
      "duplicate location"
    ]
  );
  assert.equal(toHoursRecords({}).problems.length, 1);
});

test("buildImportPlan attaches hours by location name; unknown hours become {}", () => {
  const csv = [
    HEADER,
    'sw--club,Subway,"Poly Canyon Village; Kennedy Library (Dexter Bldg)",6-inch Subs,Club,6 inch,9.99,310,,23,40,6,,yes,src,nut,2026-10-05,'
  ].join("\n");
  const { items } = toItemRecords(parseCsv(csv));
  const { hours } = toHoursRecords({
    locations: [
      {
        name: "Subway (Poly Canyon Village)",
        hours: WEEK,
        source: "Grubhub campus app",
        collected_on: "2026-10-30"
      },
      { name: "Subway (Kennedy Library)", hours: null },
      { name: "Subway (Nowhere)", hours: null }
    ]
  });
  const plan = buildImportPlan(items, [], hours);

  assert.deepEqual(
    plan.locations.map((l) => [l.name, l.hours]),
    [
      ["Subway (Poly Canyon Village)", WEEK],
      ["Subway (Kennedy Library)", {}]
    ]
  );
  assert.deepEqual(plan.locationsWithoutHours, ["Subway (Kennedy Library)"]);
  assert.deepEqual(plan.unmatchedHours, ["Subway (Nowhere)"]);
});

// In-memory stand-in for the Supabase upsert API: rows are keyed by the onConflict columns,
// the way Postgres "insert ... on conflict do update" behaves.
function fakeDb() {
  const tables = new Map<string, Map<string, Record<string, unknown>>>();
  let nextId = 0;
  const client = {
    from(table: string) {
      return {
        upsert(
          rows: Record<string, unknown>[],
          { onConflict }: { onConflict: string }
        ) {
          const stored = tables.get(table) ?? new Map();
          tables.set(table, stored);
          const written = rows.map((row) => {
            const key = onConflict
              .split(",")
              .map((column) => String(row[column]))
              .join("|");
            const existing = stored.get(key);
            const next = {
              ...existing,
              ...row,
              id: existing?.id ?? `${table}-${nextId++}`
            };
            stored.set(key, next);
            return next;
          });
          return Object.assign(
            Promise.resolve({ data: null, error: null }),
            {
              select: () =>
                Promise.resolve({ data: written, error: null })
            }
          );
        }
      };
    }
  };
  return { tables, db: client as unknown as SupabaseClient };
}

test("re-running the load with hours updates rows instead of duplicating them", async () => {
  const csv = [
    HEADER,
    'sw--club,Subway,"Poly Canyon Village; Kennedy Library (Dexter Bldg)",6-inch Subs,Club,6 inch,9.99,310,,23,40,6,,yes,src,nut,2026-10-05,'
  ].join("\n");
  const { items } = toItemRecords(parseCsv(csv));
  const { tables, db } = fakeDb();

  await load(db, buildImportPlan(items, [], []));
  const firstIds = [...tables.get("dining_locations")!.values()].map(
    (row) => row.id
  );

  const { hours } = toHoursRecords({
    locations: [
      {
        name: "Subway (Poly Canyon Village)",
        hours: WEEK,
        source: "Grubhub campus app",
        collected_on: "2026-10-30"
      }
    ]
  });
  await load(db, buildImportPlan(items, [], hours));
  await load(db, buildImportPlan(items, [], hours));

  const locations = [...tables.get("dining_locations")!.values()];
  assert.equal(locations.length, 2);
  assert.deepEqual(
    locations.map((row) => row.id),
    firstIds
  );
  assert.deepEqual(
    locations.map((row) => [row.name, row.hours]),
    [
      ["Subway (Poly Canyon Village)", WEEK],
      ["Subway (Kennedy Library)", {}]
    ]
  );
  assert.equal(tables.get("meals")!.size, 1);
  assert.equal(tables.get("menu_offerings")!.size, 2);
});

const BREAKFAST = Object.fromEntries(
  ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => [
    d,
    [{ open: "00:00", close: "10:30" }]
  ])
);
const WINDOW_RULES = {
  meal_rules: [
    { restaurant: "Chick-fil-A", category: "Breakfast", windows: BREAKFAST, source: "cfa.com", verified: "chain-wide" },
    { restaurant: "Subway", category: "Breakfast", windows: "unknown", source: null, verified: "not verified" }
  ],
  combo_rules: [
    { restaurant: "Chick-fil-A", description_prefix: "Breakfast meal", windows: BREAKFAST, source: "cfa.com", verified: "chain-wide" }
  ],
  overrides: [
    { source_id: "cfa--fruit", windows: null, source: "campus menu", verified: "all day" },
    { source_id: "cfa--nothing", windows: null, source: "x", verified: "x" }
  ]
};

test("toServingWindowRules validates rules like the hours file", () => {
  const { rules, problems } = toServingWindowRules({
    ...WINDOW_RULES,
    meal_rules: [
      ...WINDOW_RULES.meal_rules,
      { restaurant: "X", category: "Y", windows: null, verified: "v" },
      { restaurant: "X", category: "Y", windows: { mon: [] }, source: "s", verified: "v" },
      { restaurant: "X", category: "Y", windows: BREAKFAST, verified: "v" },
      { restaurant: "X", category: "Y", windows: "unknown" },
      { category: "Y", windows: "unknown", verified: "v" }
    ],
    overrides: [...WINDOW_RULES.overrides, { source_id: "cfa--fruit", windows: null, verified: "v" }]
  });
  assert.equal(rules.mealRules.length, 2);
  assert.equal(rules.comboRules.length, 1);
  assert.equal(rules.overrides.length, 2);
  assert.deepEqual(
    problems.map((p) => p.message),
    [
      'windows must be hours or "unknown"',
      "sun is missing (use [] for a closed day)",
      "source is required when windows are set",
      "verified note is required",
      "restaurant and category are required",
      "duplicate source_id"
    ]
  );
});

const WINDOW_CSV = [
  HEADER,
  "cfa--biscuit,Chick-fil-A,1901 Marketplace,Breakfast,Biscuit,1,4.65,1,,1,1,1,,yes,,,2026-10-05,",
  "cfa--fruit,Chick-fil-A,1901 Marketplace,Breakfast,Fruit Cup,1,4.99,1,,1,1,1,,yes,,,2026-10-05,",
  "cfa--sandwich,Chick-fil-A,1901 Marketplace,Entrees,Sandwich,1,6.49,1,,1,1,1,,yes,,,2026-10-05,",
  "sw--egg,Subway,Poly Canyon Village,Breakfast,Egg & Cheese,1,7.09,1,,1,1,1,,yes,,,2026-10-05,"
].join("\n");
const WINDOW_COMBOS = toComboRecords([
  { restaurant: "Chick-fil-A", combo: "Biscuit Meal", description: "Breakfast meal: entree + side + drink", price_usd: "8.69" },
  { restaurant: "Chick-fil-A", combo: "Sandwich Meal", description: "Lunch meal: entree + side + drink", price_usd: "11.55" }
]).combos;

test("applyServingWindows sets windows by restaurant + category, combo description, and overrides", () => {
  const { items } = toItemRecords(parseCsv(WINDOW_CSV));
  const { rules } = toServingWindowRules(WINDOW_RULES);
  const { plan, unmatched } = applyServingWindows(buildImportPlan(items, WINDOW_COMBOS), rules);

  assert.deepEqual(
    plan.meals.map((m) => [m.source_id, m.serving_windows]),
    [
      ["cfa--biscuit", BREAKFAST],
      ["cfa--fruit", null],
      ["cfa--sandwich", null],
      ["sw--egg", "unknown"]
    ]
  );
  assert.deepEqual(
    plan.combos.map((c) => [c.name, c.serving_windows]),
    [
      ["Biscuit Meal", BREAKFAST],
      ["Sandwich Meal", null]
    ]
  );
  assert.deepEqual(unmatched, ["override cfa--nothing"]);
});

test("re-running the load with serving windows updates rows instead of duplicating them", async () => {
  const { items } = toItemRecords(parseCsv(WINDOW_CSV));
  const { rules } = toServingWindowRules(WINDOW_RULES);
  const { tables, db } = fakeDb();

  await load(db, buildImportPlan(items, WINDOW_COMBOS));
  await load(db, applyServingWindows(buildImportPlan(items, WINDOW_COMBOS), rules).plan);
  await load(db, applyServingWindows(buildImportPlan(items, WINDOW_COMBOS), rules).plan);

  const meals = [...tables.get("meals")!.values()];
  const combos = [...tables.get("menu_combos")!.values()];
  assert.equal(meals.length, 4);
  assert.equal(combos.length, 2);
  assert.deepEqual(
    meals.map((m) => [m.source_id, m.serving_windows]),
    [
      ["cfa--biscuit", BREAKFAST],
      ["cfa--fruit", null],
      ["cfa--sandwich", null],
      ["sw--egg", "unknown"]
    ]
  );
  assert.equal(combos[0]?.serving_windows, BREAKFAST);
});

test("the real data files import without problems", () => {
  const dataDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../data"
  );
  const items = toItemRecords(
    parseCsv(
      readFileSync(path.join(dataDir, "menu_items.csv"), "utf8")
    )
  );
  const combos = toComboRecords(
    parseCsv(
      readFileSync(
        path.join(dataDir, "menu_combos.csv"),
        "utf8"
      )
    )
  );

  const hours = toHoursRecords(
    JSON.parse(
      readFileSync(path.join(dataDir, "dining_hours.json"), "utf8")
    )
  );
  const windows = toServingWindowRules(
    JSON.parse(
      readFileSync(path.join(dataDir, "serving_windows.json"), "utf8")
    )
  );
  assert.deepEqual(windows.problems, []);

  assert.deepEqual(items.problems, []);
  assert.deepEqual(combos.problems, []);
  assert.deepEqual(hours.problems, []);
  const plan = buildImportPlan(
    items.items,
    combos.combos,
    hours.hours
  );
  // dining_hours.json has exactly one entry per generated location name.
  assert.deepEqual(plan.unmatchedHours, []);
  assert.deepEqual(plan.locationsWithoutHours, []);
  // Closed days are empty arrays, e.g. Chick-fil-A on Sunday.
  const chickFilA = plan.locations.find((l) =>
    l.name.startsWith("Chick-fil-A")
  );
  assert.deepEqual(chickFilA?.hours.sun, []);

  const windowed = applyServingWindows(plan, windows.rules);
  assert.deepEqual(windowed.unmatched, []);
  const windowOf = (sourceId: string) =>
    windowed.plan.meals.find((m) => m.source_id === sourceId)?.serving_windows;
  const cfaBreakfast = windowed.plan.meals.filter(
    (m) => m.restaurant === "Chick-fil-A" && m.category === "Breakfast"
  );
  // 20 Chick-fil-A breakfast rows; both parfaits are all-day sides.
  assert.equal(cfaBreakfast.filter((m) => m.serving_windows !== null).length, 18);
  assert.equal(windowOf("chick-fil-a--fruit-cup"), null);
  assert.equal(windowOf("chick-fil-a--greek-yogurt-parfait"), null);
  assert.equal(
    (windowOf("chick-fil-a--hash-brown") as Record<string, unknown>)?.sat !== undefined,
    true
  );
  assert.deepEqual(
    windowed.plan.meals
      .filter((m) => m.serving_windows === "unknown")
      .map((m) => m.restaurant),
    ["Subway", "Subway", "Subway", "Subway"]
  );
  assert.equal(
    windowed.plan.combos.filter((c) => c.serving_windows !== null).length,
    13
  );
  assert.deepEqual(
    hours.hours.map((h) => h.locationName).sort(),
    plan.locations.map((l) => l.name).sort()
  );
  assert.equal(plan.meals.length, 192);
  assert.equal(
    plan.meals.filter((meal) => meal.allergens_verified).length,
    33
  );
  assert.equal(plan.combos.length, 41);
});
