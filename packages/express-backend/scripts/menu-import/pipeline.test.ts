import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildImportPlan,
  parseCsv,
  splitCampusAreas,
  toComboRecords,
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

  assert.deepEqual(items.problems, []);
  assert.deepEqual(combos.problems, []);
  const plan = buildImportPlan(items.items, combos.combos);
  assert.equal(plan.meals.length, 192);
  assert.equal(plan.combos.length, 41);
});
