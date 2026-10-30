import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { load } from "./load.js";
import {
  buildImportPlan,
  parseCsv,
  splitCampusAreas,
  toComboRecords,
  toHoursRecords,
  toItemRecords
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
  assert.deepEqual(
    hours.hours.map((h) => h.locationName).sort(),
    plan.locations.map((l) => l.name).sort()
  );
  assert.equal(plan.meals.length, 192);
  assert.equal(plan.combos.length, 41);
});
