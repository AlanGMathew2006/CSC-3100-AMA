import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseCsv,
  parseCsvTable,
  toComboContents,
  toComboRecords,
  toItemRecords,
  toServingWindowRules
} from "../menu-import/pipeline.js";
import {
  FILL_IN_HEADER,
  applyFillIn,
  knownTargets,
  parseContents,
  parseWindow,
  readFillIn,
  remainingSheet,
  toCsv,
  type ComboContentsFile,
  type ComboEntry,
  type FillInRow,
  type SlotPart,
  type ServingWindowsFile
} from "./fill-in.js";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../data");
const readData = (name: string) => readFileSync(path.join(dataDir, name), "utf8");

// ---------- Mock data ----------

const ITEMS = [
  ["id", "restaurant", "item_name", "price_usd", "price_source", "notes"],
  ["cfa--sandwich", "Chick-fil-A", "Chicken Sandwich", "6.49", "Grubhub", ""],
  ["cfa--nuggets-12", "Chick-fil-A", "Nuggets (12 ct)", "", "", "Not priced on Grubhub."],
  ["cfa--sauce", "Chick-fil-A", "Sauce", "", "", "Free with entrees."],
  ["cfa--nuggets-8", "Chick-fil-A", "Nuggets (8 ct)", "7.25", "Grubhub", ""],
  ["cfa--fries", "Chick-fil-A", "Fries", "3.45", "Grubhub", ""],
  ["cfa--hash-brown", "Chick-fil-A", "Hash Brown", "1.89", "Grubhub", ""],
  ["cfa--tea", "Chick-fil-A", "Tea", "2.89", "Grubhub", ""],
  ["cfa--biscuit", "Chick-fil-A", "Chicken Biscuit", "5.25", "Grubhub", ""],
  ["tb--taco", "Taco Bell", "Crunchy Taco", "1.99", "Grubhub", ""],
  ["tb--drink", "Taco Bell", "Medium Drink", "2.49", "Grubhub", ""],
  ["px--rice", "Panda Express", "Fried Rice", "", "", ""],
  ["px--orange", "Panda Express", "Orange Chicken", "", "", ""],
  ["px--beef", "Panda Express", "Beijing Beef", "", "", ""],
  ["sub--egg", "Subway", "Egg & Cheese", "5.49", "subway.com", ""]
];

const slot = (kind: "side" | "drink", first: string, ...rest: string[]): SlotPart => ({
  slot: kind,
  choices: [first, ...rest],
  default: first
});

// Asserting lookups, so a missing entry fails the test with a clear message.
function entry(contents: ComboContentsFile, id: string): ComboEntry {
  const found = contents[id];
  assert.ok(found, `no combo ${id}`);
  return found;
}
function defined<T>(value: T | undefined, what: string): T {
  assert.ok(value !== undefined, `missing ${what}`);
  return value;
}

const CONTENTS: ComboContentsFile = {
  "cfa--nuggets-meal": {
    source: "csv",
    verified: false,
    components: [{ meal: "cfa--nuggets-8", servings: 1 }, slot("side", "cfa--fries"), slot("drink", "cfa--tea")],
    notes: "count unknown"
  },
  "cfa--biscuit-meal": {
    source: "csv",
    verified: false,
    components: [{ meal: "cfa--biscuit", servings: 1 }, slot("side", "cfa--hash-brown"), slot("drink", "cfa--tea")],
    notes: "placeholders"
  },
  "cfa--sandwich-meal": {
    source: "csv",
    verified: true,
    components: [{ meal: "cfa--sandwich", servings: 1 }, slot("side", "cfa--fries"), slot("drink", "cfa--tea")]
  },
  "tb--taco-combo": { source: "csv", verified: false, components: [] },
  "px--4-plate": {
    source: "csv",
    verified: false,
    components: [{ meal: "px--rice", servings: 1 }, { meal: "px--orange", servings: 1 }]
  }
};

const WINDOWS: ServingWindowsFile = {
  timezone: "America/Los_Angeles",
  meal_rules: [
    { restaurant: "Chick-fil-A", category: "Breakfast", label: "Breakfast", windows: null, source: "chain", verified: "chain-wide" },
    { restaurant: "Subway", category: "Breakfast", label: "Breakfast", windows: "unknown", source: null, verified: "no" }
  ],
  combo_rules: [
    { restaurant: "Chick-fil-A", description_prefix: "Breakfast meal", label: "Breakfast", windows: null, source: "chain", verified: "chain-wide" }
  ],
  overrides: []
};

const known = knownTargets(ITEMS, CONTENTS);

const sheet = (...rows: [string, string, string, string?][]) => [
  FILL_IN_HEADER,
  ...rows.map(([id, missing, value, source = value ? "Grubhub campus app, 2026-11-20" : ""]) => [
    id,
    "",
    "",
    missing,
    "",
    value,
    source
  ])
];

const read = (...rows: [string, string, string, string?][]) => readFillIn(sheet(...rows), known);

const apply = (rows: FillInRow[]) =>
  applyFillIn({ items: ITEMS, windows: WINDOWS, contents: CONTENTS, rows });

// ---------- Stage: parse / write ----------

test("toCsv writes the real data files back unchanged", () => {
  for (const name of ["menu_items.csv", "menu_combos.csv", "manual_fill_in.csv"]) {
    const text = readData(name);
    assert.equal(toCsv(parseCsvTable(text)), text, name);
  }
});

test("parseWindow and parseContents read the value formats", () => {
  assert.equal(parseWindow("all day"), null);
  assert.deepEqual((parseWindow("00:00-10:30") as Record<string, unknown>).wed, [{ open: "00:00", close: "10:30" }]);
  assert.equal(parseWindow("7:00-10:30"), undefined);
  assert.equal(parseWindow("10:30"), undefined);
  assert.deepEqual(parseContents("tb--taco x3; drink=tb--drink"), [
    { meal: "tb--taco", servings: 3 },
    { slot: "drink", choices: ["tb--drink"], default: "tb--drink" }
  ]);
  assert.deepEqual(parseContents("px--rice x0.5; px--orange"), [
    { meal: "px--rice", servings: 0.5 },
    { meal: "px--orange", servings: 1 }
  ]);
  assert.equal(typeof parseContents("tb--taco x0"), "string");
  assert.equal(typeof parseContents(""), "string");
});

// ---------- Stage: clean + validate ----------

test("readFillIn accepts blank rows and valid values", () => {
  const { rows, problems } = read(
    ["cfa--nuggets-12", "price", ""],
    ["cfa--nuggets-12", "serving_window", "all day"],
    ["cfa--sauce", "price", "none"],
    ["rule:Subway:Breakfast", "serving_window", "00:00-10:30"],
    ["tb--taco-combo", "combo_contents", "tb--taco x3; drink=tb--drink"],
    ["cfa--nuggets-meal", "combo_entree", "cfa--nuggets-12"],
    ["px--4-plate", "combo_part", "px--beef"],
    ["cfa--biscuit-meal", "combo_side", "cfa--hash-brown|cfa--fries"]
  );
  assert.deepEqual(problems, []);
  assert.equal(rows.length, 8);
});

test("readFillIn reports bad prices, windows, ids, kinds, missing sources and duplicates", () => {
  const { problems } = read(
    ["cfa--nuggets-12", "price", "0.00"],
    ["cfa--sandwich", "price", "8.9"],
    ["cfa--sauce", "price", "$1.00"],
    ["cfa--fries", "price", "3.45", ""],
    ["cfa--biscuit", "serving_window", "7am-10:30am"],
    ["nope", "price", ""],
    ["rule:Nowhere:Breakfast", "serving_window", ""],
    ["nope-combo", "combo_side", ""],
    ["cfa--nuggets-meal", "combo_entree", "cfa--nuggets-99"],
    ["cfa--sandwich-meal", "combo_drink_choices", "cfa--tea|cfa--soda"],
    ["tb--taco-combo", "combo_contents", "tb--taco x-1"],
    ["cfa--biscuit-meal", "combo_entree", "cfa--biscuit x2"],
    ["cfa--hash-brown", "calories", "300"],
    ["cfa--tea", "price", ""],
    ["cfa--tea", "price", ""]
  );
  assert.deepEqual(
    problems.map((p) => [p.id, p.message]),
    [
      ["cfa--nuggets-12", 'price "0.00" must be more than 0 with two decimals, e.g. 8.99 (or "none")'],
      ["cfa--sandwich", 'price "8.9" must be more than 0 with two decimals, e.g. 8.99 (or "none")'],
      ["cfa--sauce", 'price "$1.00" must be more than 0 with two decimals, e.g. 8.99 (or "none")'],
      ["cfa--fries", "source is required when value is filled in"],
      ["cfa--biscuit", 'serving window "7am-10:30am" must be HH:MM-HH:MM or "all day"'],
      ["nope", "matches no id in menu_items.csv"],
      ["rule:Nowhere:Breakfast", 'matches no menu item (or "rule:<Restaurant>:<Category>")'],
      ["nope-combo", "matches no combo in combo_contents.json"],
      ["cfa--nuggets-meal", "unknown menu item id(s): cfa--nuggets-99"],
      ["cfa--sandwich-meal", "unknown menu item id(s): cfa--soda"],
      ["tb--taco-combo", '"tb--taco x-1" is not "<id>" or "<id> x<count>"'],
      ["cfa--biscuit-meal", '"cfa--biscuit x2" is not one menu item id'],
      ["cfa--hash-brown", 'unknown "missing" value "calories"'],
      ["cfa--tea", "duplicate row for price"]
    ]
  );
});

test("readFillIn needs every column", () => {
  const { problems } = readFillIn([["id", "missing", "value"]], known);
  assert.equal(problems[0]?.message, "missing columns: restaurant, item, current_note, source");
});

// ---------- Stage: transform ----------

test("applyFillIn sets prices with their source, and 'none' adds a note instead of a price", () => {
  const { rows } = read(["cfa--nuggets-12", "price", "9.15"], ["cfa--sauce", "price", "none"], ["cfa--tea", "price", ""]);
  const result = apply(rows);
  const row = (id: string) => result.items.find((r) => r[0] === id);
  assert.deepEqual(row("cfa--nuggets-12")?.slice(3), ["9.15", "Grubhub campus app, 2026-11-20", "Not priced on Grubhub."]);
  assert.deepEqual(row("cfa--sauce")?.slice(3), ["", "", "Free with entrees. Not sold on its own (Grubhub campus app, 2026-11-20)."]);
  assert.deepEqual(result.applied.map((r) => r.id), ["cfa--nuggets-12", "cfa--sauce"]);
  assert.deepEqual(result.remaining.map((r) => r.id), ["cfa--tea"]);
  // Inputs are untouched.
  assert.equal(ITEMS[2]?.[3], "");
});

test("applyFillIn updates a restaurant rule (and its combo rules) or adds an item override", () => {
  const { rows } = read(
    ["rule:Chick-fil-A:Breakfast", "serving_window", "00:00-10:00"],
    ["rule:Subway:Breakfast", "serving_window", "07:00-11:00"],
    ["cfa--biscuit", "serving_window", "all day"]
  );
  const { windows } = apply(rows);
  const cfa = defined(windows.meal_rules[0], "Chick-fil-A rule");
  assert.deepEqual((cfa.windows as Record<string, unknown>).mon, [{ open: "00:00", close: "10:00" }]);
  assert.equal(cfa.source, "Grubhub campus app, 2026-11-20");
  assert.match(cfa.verified, /^Confirmed \d{4}-\d{2}-\d{2} via data\/manual_fill_in\.csv$/);
  assert.deepEqual(defined(windows.combo_rules[0], "combo rule").windows, cfa.windows);
  assert.deepEqual((defined(windows.meal_rules[1], "Subway rule").windows as Record<string, unknown>).sun, [
    { open: "07:00", close: "11:00" }
  ]);
  assert.deepEqual(windows.overrides.map((o) => [o.source_id, o.windows]), [["cfa--biscuit", null]]);
  assert.equal(WINDOWS.meal_rules[1]?.windows, "unknown");
});

test("applyFillIn fills combos and verifies one only when none of its blocking rows are left", () => {
  const { rows } = read(
    ["tb--taco-combo", "combo_contents", "tb--taco x3; drink=tb--drink"],
    ["cfa--nuggets-meal", "combo_entree", "cfa--nuggets-12"],
    ["cfa--nuggets-meal", "combo_side_choices", ""],
    ["px--4-plate", "combo_part", "px--beef"],
    ["cfa--biscuit-meal", "combo_side", "cfa--hash-brown|cfa--fries"],
    ["cfa--biscuit-meal", "combo_drink", ""],
    ["cfa--sandwich-meal", "combo_drink_choices", "cfa--tea|tb--drink"]
  );
  const result = apply(rows);
  const c = (id: string) => entry(result.contents, id);
  assert.deepEqual(c("tb--taco-combo").components, [
    { meal: "tb--taco", servings: 3 },
    { slot: "drink", choices: ["tb--drink"], default: "tb--drink" }
  ]);
  assert.deepEqual(c("cfa--nuggets-meal").components[0], { meal: "cfa--nuggets-12", servings: 1 });
  assert.deepEqual(c("px--4-plate").components.at(-1), { meal: "px--beef", servings: 1 });
  assert.deepEqual(c("cfa--biscuit-meal").components[1], slot("side", "cfa--hash-brown", "cfa--fries"));
  assert.deepEqual(c("cfa--sandwich-meal").components[2], slot("drink", "cfa--tea", "tb--drink"));
  // The choices row left blank doesn't block the nugget meal; the biscuit meal's drink row does.
  assert.deepEqual(result.verifiedCombos.sort(), ["cfa--nuggets-meal", "px--4-plate", "tb--taco-combo"]);
  assert.equal(c("cfa--biscuit-meal").verified, false);
  assert.equal(c("cfa--biscuit-meal").notes, "placeholders");
  assert.equal(c("cfa--nuggets-meal").notes, undefined);
  assert.equal(c("cfa--nuggets-meal").source, "csv; Grubhub campus app, 2026-11-20");
  assert.equal(c("cfa--sandwich-meal").verified, true);
  assert.equal(entry(CONTENTS, "tb--taco-combo").components.length, 0);
});

test("a combo_part is added after the fixed parts, before the slots", () => {
  const contents: ComboContentsFile = {
    ...CONTENTS,
    "px--4-plate": { ...entry(CONTENTS, "px--4-plate"), components: [{ meal: "px--rice", servings: 1 }, slot("drink", "cfa--tea")] }
  };
  const { rows } = read(["px--4-plate", "combo_part", "px--beef x2"]);
  const result = applyFillIn({ items: ITEMS, windows: WINDOWS, contents, rows });
  assert.deepEqual(entry(result.contents, "px--4-plate").components, [
    { meal: "px--rice", servings: 1 },
    { meal: "px--beef", servings: 2 },
    slot("drink", "cfa--tea")
  ]);
});

test("remainingSheet keeps only the blank rows", () => {
  const table = sheet(["cfa--nuggets-12", "price", "9.15"], ["cfa--tea", "price", ""]);
  const { rows } = readFillIn(table, known);
  const result = apply(rows);
  assert.deepEqual(remainingSheet(table, result.remaining).map((r) => r[0]), ["id", "cfa--tea"]);
});

// ---------- The real files ----------

test("the real fill-in sheet is valid and lists every open item", () => {
  const items = parseCsvTable(readData("menu_items.csv"));
  const contents = JSON.parse(readData("combo_contents.json")) as ComboContentsFile;
  const { rows, problems } = readFillIn(parseCsvTable(readData("manual_fill_in.csv")), knownTargets(items, contents));
  assert.deepEqual(problems, []);
  // Every unverified fixed combo has at least one blocking row in the sheet.
  const blocking = new Set(
    rows.filter((r) => ["combo_contents", "combo_entree", "combo_part", "combo_side", "combo_drink"].includes(r.missing)).map((r) => r.id)
  );
  assert.deepEqual(
    Object.entries(contents).filter(([id, e]) => !e.verified && !blocking.has(id)).map(([id]) => id),
    []
  );
  // Every unpriced item that isn't a combo-only Panda part has a price row.
  const header = defined(items[0], "menu_items.csv header");
  const unpriced = items
    .slice(1)
    .filter((row) => !row[header.indexOf("price_usd")] && !row[header.indexOf("meal_component")])
    .map((row) => row[0]);
  assert.deepEqual(unpriced.filter((id) => !rows.some((r) => r.id === id && r.missing === "price")), []);
});

test("filling real rows gives files that pass the import's own checks", () => {
  const items = parseCsvTable(readData("menu_items.csv"));
  const contents = JSON.parse(readData("combo_contents.json")) as ComboContentsFile;
  const table = parseCsvTable(readData("manual_fill_in.csv"));
  const fill: Record<string, string> = {
    "chick-fil-a--chick-fil-a-sauce|price": "none",
    "chick-fil-a--grilled-nuggets-12-ct|price": "9.99",
    "rule:Subway:Breakfast|serving_window": "00:00-10:30",
    "chick-fil-a--mini-yeast-rolls-4-ct|serving_window": "all day",
    "chick-fil-a--combo--chick-fil-a-nuggets-meal|combo_entree": "chick-fil-a--chick-fil-a-nuggets-8-ct",
    "panda-express--combo--4-plate|combo_part": "panda-express--beijing-beef",
    "taco-bell--combo--3-crunchy-taco-combo|combo_contents": "taco-bell--crunchy-taco x3"
  };
  // Mock values only, to exercise the merge on the real files (never written to disk here).
  for (const row of table.slice(1)) {
    const value = fill[`${row[0]}|${row[3]}`];
    if (value) [row[5], row[6]] = [value, "test value"];
  }
  const { rows, problems } = readFillIn(table, knownTargets(items, contents));
  assert.deepEqual(problems, []);
  const result = applyFillIn({
    items,
    windows: JSON.parse(readData("serving_windows.json")) as ServingWindowsFile,
    contents,
    rows
  });
  assert.equal(result.applied.length, Object.keys(fill).length);
  const records = toItemRecords(parseCsv(toCsv(result.items)));
  assert.deepEqual(records.problems, []);
  assert.deepEqual(toServingWindowRules(result.windows).problems, []);
  const combos = toComboRecords(parseCsv(readData("menu_combos.csv"))).combos;
  assert.deepEqual(
    toComboContents(result.contents, records.items.map((i) => i.sourceId), combos).problems,
    []
  );
  assert.deepEqual(result.verifiedCombos.sort(), [
    "chick-fil-a--combo--chick-fil-a-nuggets-meal",
    "panda-express--combo--4-plate",
    "taco-bell--combo--3-crunchy-taco-combo"
  ]);
});
