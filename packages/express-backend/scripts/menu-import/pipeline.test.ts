import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { load } from "./load.js";
import {
  applyComboContents,
  applyMealRoles,
  applyServingWindows,
  buildImportPlan,
  parseCsv,
  splitCampusAreas,
  toComboContents,
  toComboRecords,
  toHoursRecords,
  toItemRecords,
  toMealRoleRules,
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

test("toMealRoleRules validates roles, duplicates, and required fields", () => {
  const { rules, problems } = toMealRoleRules({
    rules: [
      { restaurant: "Chick-fil-A", category: "Breakfast", role: "main" },
      { restaurant: "Chick-fil-A", category: "breakfast", role: "side" },
      { restaurant: "Chick-fil-A", category: "Desserts", role: "treat" },
      { restaurant: "Chick-fil-A", role: "main" }
    ],
    overrides: [
      { source_id: "cfa--fruit", role: "side" },
      { source_id: "cfa--fruit", role: "side" },
      { role: "side" }
    ]
  });
  assert.equal(rules.rules.length, 1);
  assert.equal(rules.overrides.length, 1);
  assert.deepEqual(
    problems.map((p) => p.message),
    [
      "duplicate rule",
      'unknown role "treat"',
      "restaurant and category are required",
      "duplicate source_id",
      "source_id is required"
    ]
  );
});

test("applyMealRoles uses category rules and overrides, and reports meals with no role", () => {
  const { items } = toItemRecords(parseCsv(WINDOW_CSV));
  const { rules } = toMealRoleRules({
    rules: [
      { restaurant: "Chick-fil-A", category: "Breakfast", role: "main" },
      { restaurant: "Chick-fil-A", category: "Entrees", role: "main" }
    ],
    overrides: [
      { source_id: "cfa--fruit", role: "side" },
      { source_id: "cfa--gone", role: "side" }
    ]
  });
  const { plan, missing, unmatched } = applyMealRoles(buildImportPlan(items, []), rules);
  assert.deepEqual(
    plan.meals.map((m) => [m.source_id, m.meal_role]),
    [
      ["cfa--biscuit", "main"],
      ["cfa--fruit", "side"],
      ["cfa--sandwich", "main"],
      ["sw--egg", null]
    ]
  );
  assert.deepEqual(missing, ["sw--egg"]);
  assert.deepEqual(unmatched, ["cfa--gone"]);
});

// ---------- Combo contents ----------

const CONTENT_COMBOS = toComboRecords([
  { restaurant: "Panda Express", combo: "Plate", description: "1 base + 2 entrees", bases: "1", entrees: "2", price_usd: "11.3" },
  { restaurant: "Panda Express", combo: "#1 Plate", description: "Rice, Chicken, Beef", bases: "1", entrees: "2", price_usd: "11.3" },
  { restaurant: "Chick-fil-A", combo: "Sandwich Meal", description: "Lunch meal: entree + side + drink", price_usd: "11.55" }
]).combos;
const CONTENT_MEALS = ["px--rice", "px--chicken", "px--beef", "cfa--sandwich", "cfa--fries", "cfa--tea"];
const GOOD_CONTENTS = {
  "panda-express--combo--1-plate": {
    source: "csv",
    verified: true,
    components: [
      { meal: "px--rice", servings: 1 },
      { meal: "px--chicken", servings: 1 },
      { meal: "px--beef", servings: 1 }
    ]
  },
  "chick-fil-a--combo--sandwich-meal": {
    source: "csv",
    verified: true,
    components: [
      { meal: "cfa--sandwich", servings: 1 },
      { slot: "side", choices: ["cfa--fries"], default: "cfa--fries" },
      { slot: "drink", choices: ["cfa--tea"], default: "cfa--tea" }
    ]
  }
};

test("toComboContents accepts fixed parts and slots, and build-your-own combos need no entry", () => {
  const { contents, problems } = toComboContents(GOOD_CONTENTS, CONTENT_MEALS, CONTENT_COMBOS);
  assert.deepEqual(problems, []);
  assert.deepEqual([...contents.keys()], ["panda-express--combo--1-plate", "chick-fil-a--combo--sandwich-meal"]);
  assert.equal(contents.get("chick-fil-a--combo--sandwich-meal")?.components.length, 3);
  assert.equal(contents.get("panda-express--combo--1-plate")?.notes, null);
});

test("toComboContents reports unknown ids, bad servings, bad defaults and missing entries", () => {
  const sandwich = GOOD_CONTENTS["chick-fil-a--combo--sandwich-meal"];
  const cases: [unknown, string][] = [
    [{ meal: "px--nope", servings: 1 }, 'unknown meal "px--nope"'],
    [{ meal: "px--rice", servings: 0 }, "servings for px--rice must be a number > 0"],
    [{ meal: "px--rice", servings: "1" }, "servings for px--rice must be a number > 0"],
    [{ slot: "side", choices: ["cfa--fries"], default: "cfa--tea" }, "side default must be one of its choices"],
    [{ slot: "side", choices: ["cfa--nope"], default: "cfa--nope" }, 'unknown meal "cfa--nope" in side choices'],
    [{ slot: "side", choices: [], default: "cfa--fries" }, "side slot needs at least one choice"],
    [{ slot: "dessert", choices: ["cfa--fries"], default: "cfa--fries" }, 'unknown slot "dessert"'],
    [{ servings: 1 }, 'each component needs "meal" or "slot"']
  ];
  for (const [component, message] of cases) {
    const { contents, problems } = toComboContents(
      { "chick-fil-a--combo--sandwich-meal": { ...sandwich, components: [component] } },
      CONTENT_MEALS,
      CONTENT_COMBOS
    );
    assert.equal(contents.size, 0);
    // The bad entry is dropped (and not reported twice); #1 Plate isn't in this file at all.
    assert.deepEqual(
      problems.map((p) => [p.id, p.message]),
      [
        ["chick-fil-a--combo--sandwich-meal", message],
        ["panda-express--combo--1-plate", "fixed-content combo has no entry"]
      ]
    );
  }

  const { problems } = toComboContents(
    {
      ...GOOD_CONTENTS,
      "panda-express--combo--plate": { source: "csv", verified: true, components: [] },
      "taco-bell--combo--ghost": { source: "csv", verified: false, components: [] },
      "chick-fil-a--combo--sandwich-meal": {
        ...sandwich,
        components: [...sandwich.components, { slot: "side", choices: ["cfa--fries"], default: "cfa--fries" }]
      }
    },
    CONTENT_MEALS,
    CONTENT_COMBOS
  );
  assert.deepEqual(
    problems.map((p) => [p.id, p.message]),
    [
      ["chick-fil-a--combo--sandwich-meal", "duplicate slot"],
      ["panda-express--combo--plate", "build-your-own combos have no fixed contents"],
      ["taco-bell--combo--ghost", "matches no combo in menu_combos.csv"]
    ]
  );

  const empty = toComboContents(
    { "panda-express--combo--1-plate": { source: "csv", verified: true, components: [] } },
    CONTENT_MEALS,
    CONTENT_COMBOS
  );
  assert.deepEqual(empty.problems.map((p) => p.message), [
    "verified contents need at least one component",
    "fixed-content combo has no entry"
  ]);
  assert.deepEqual(
    toComboContents([], CONTENT_MEALS, CONTENT_COMBOS).problems.map((p) => p.message),
    ["expected an object keyed by combo source_id"]
  );
});

test("re-running the load with combo contents stores meal ids and never duplicates", async () => {
  const csv = [
    HEADER,
    "px--rice,Panda Express,1901 Marketplace,Bases,Rice,1,,520,,11,85,16,base,yes,,,2026-10-05,",
    "px--chicken,Panda Express,1901 Marketplace,Entrees,Chicken,1,,490,,25,51,23,entree,yes,,,2026-10-05,",
    "px--beef,Panda Express,1901 Marketplace,Entrees,Beef,1,,150,,9,13,7,entree,yes,,,2026-10-05,",
    "cfa--sandwich,Chick-fil-A,1901 Marketplace,Entrees,Sandwich,1,6.49,420,,29,41,16,,yes,,,2026-10-05,",
    "cfa--fries,Chick-fil-A,1901 Marketplace,Sides,Fries,1,3.45,420,,5,45,24,,yes,,,2026-10-05,",
    "cfa--tea,Chick-fil-A,1901 Marketplace,Drinks,Tea,1,2.89,120,,0,31,0,,yes,,,2026-10-05,"
  ].join("\n");
  const { items } = toItemRecords(parseCsv(csv));
  const { contents } = toComboContents(GOOD_CONTENTS, items.map((i) => i.sourceId), CONTENT_COMBOS);
  const plan = () => applyComboContents(buildImportPlan(items, CONTENT_COMBOS), contents);
  assert.deepEqual(plan().combos.map((c) => [c.source_id, c.contents?.verified ?? null]), [
    ["panda-express--combo--plate", null],
    ["panda-express--combo--1-plate", true],
    ["chick-fil-a--combo--sandwich-meal", true]
  ]);

  const { tables, db } = fakeDb();
  await load(db, plan());
  await load(db, plan());
  const meals = new Map([...tables.get("meals")!.values()].map((m) => [m.source_id, m.id]));
  const combos = [...tables.get("menu_combos")!.values()];
  assert.equal(combos.length, 3);
  const meal = combos.find((c) => c.source_id === "chick-fil-a--combo--sandwich-meal");
  assert.deepEqual(meal?.contents, {
    source: "csv",
    verified: true,
    notes: null,
    components: [
      { meal: meals.get("cfa--sandwich"), servings: 1 },
      { slot: "side", choices: [meals.get("cfa--fries")], default: meals.get("cfa--fries") },
      { slot: "drink", choices: [meals.get("cfa--tea")], default: meals.get("cfa--tea") }
    ]
  });
  assert.equal(combos.find((c) => c.source_id === "panda-express--combo--plate")?.contents, null);
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

  // Every meal gets a role; the import refuses to run otherwise.
  const roleRules = toMealRoleRules(
    JSON.parse(readFileSync(path.join(dataDir, "meal_roles.json"), "utf8"))
  );
  assert.deepEqual(roleRules.problems, []);
  const roles = applyMealRoles(windowed.plan, roleRules.rules);
  assert.deepEqual(roles.missing, []);
  assert.deepEqual(roles.unmatched, []);
  const roleOf = (sourceId: string) =>
    roles.plan.meals.find((m) => m.source_id === sourceId)?.meal_role;
  assert.equal(roleOf("chick-fil-a--chick-fil-a-chicken-sandwich"), "main");
  assert.equal(roleOf("chick-fil-a--spicy-chicken-biscuit"), "main");
  for (const side of [
    "chick-fil-a--hash-brown",
    "chick-fil-a--fruit-cup",
    "chick-fil-a--greek-yogurt-parfait",
    "chick-fil-a--berry-parfait-with-cookie-crumbs",
    "chick-fil-a--buttered-biscuit",
    "chick-fil-a--english-muffin",
    "chick-fil-a--mini-yeast-rolls-4-ct",
    "subway--broccoli-cheddar-soup",
    "panda-express--chicken-egg-roll"
  ])
    assert.equal(roleOf(side), "side", side);
  for (const dessert of [
    "chick-fil-a--frosted-coffee",
    "chick-fil-a--chocolate-milkshake",
    "chick-fil-a--float",
    "chick-fil-a--frosted-soda",
    "chick-fil-a--chocolate-chunk-cookie",
    "subway--chocolate-chip-cookie",
    "panda-express--apple-pie-roll",
    "panda-express--fortune-cookie",
    "taco-bell--cinnamon-twists"
  ])
    assert.equal(roleOf(dessert), "dessert", dessert);
  assert.equal(roleOf("chick-fil-a--chick-fil-a-lemonade-medium"), "drink");
  assert.equal(roleOf("chick-fil-a--polynesian-sauce"), "sauce");
  assert.equal(roleOf("panda-express--soy-sauce"), "sauce");
  assert.equal(roleOf("taco-bell--fire-sauce"), "sauce");
  assert.equal(roleOf("taco-bell--crunchwrap-supreme"), "main");
  assert.equal(roleOf("subway--tuna-footlong"), "main");
  assert.equal(roleOf("subway--6-inch-egg-cheese"), "main");
  assert.deepEqual(
    hours.hours.map((h) => h.locationName).sort(),
    plan.locations.map((l) => l.name).sort()
  );
  assert.equal(plan.meals.length, 192);
  assert.equal(
    plan.meals.filter((meal) => meal.allergens_verified).length,
    120
  );
  assert.equal(plan.combos.length, 41);

  // Every fixed-content combo has contents; only verified ones are recommended.
  const contents = toComboContents(
    JSON.parse(readFileSync(path.join(dataDir, "combo_contents.json"), "utf8")),
    items.items.map((item) => item.sourceId),
    combos.combos
  );
  assert.deepEqual(contents.problems, []);
  assert.equal(contents.contents.size, 38);
  const verified = [...contents.contents].filter(([, c]) => c.verified).map(([id]) => id);
  assert.deepEqual(verified.sort(), [
    "chick-fil-a--combo--chick-fil-a-chicken-sandwich-meal",
    "chick-fil-a--combo--chick-fil-a-deluxe-sandwich-meal",
    "chick-fil-a--combo--grilled-chicken-club-sandwich-meal",
    "chick-fil-a--combo--grilled-chicken-sandwich-meal",
    "chick-fil-a--combo--spicy-chicken-deluxe-sandwich-meal",
    "chick-fil-a--combo--spicy-chicken-sandwich-meal",
    "panda-express--combo--1-plate",
    "panda-express--combo--2-plate",
    "panda-express--combo--3-plate",
    "panda-express--combo--5-plate",
    "panda-express--combo--6-plate"
  ]);
  const six = contents.contents.get("panda-express--combo--6-plate");
  assert.deepEqual(six?.components, [
    { meal: "panda-express--white-steamed-rice", servings: 0.5 },
    { meal: "panda-express--super-greens-as-base", servings: 0.5 },
    { meal: "panda-express--grilled-teriyaki-chicken", servings: 2 }
  ]);
});
