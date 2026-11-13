// Manual fill-in sheet (data/manual_fill_in.csv), pipe and filter like the menu import:
//   sheet text -> parseCsvTable -> readFillIn (clean + validate) -> applyFillIn (transform)
//   -> the menu import's own validation stages (in ../apply-fill-in.ts) -> write.
// Each sheet row asks for one missing value (a price, a serving window, or part of a combo's
// contents). Rows with a value are merged into menu_items.csv / serving_windows.json /
// combo_contents.json and removed from the sheet; blank rows stay for later.

import type { Problem } from "../menu-import/pipeline.js";

export const FILL_IN_HEADER = ["id", "restaurant", "item", "missing", "current_note", "value", "source"];

// What a row asks for and the value it takes:
//   price                 "8.99" (> 0, two decimals), or "none" if it isn't sold on its own
//   serving_window        "HH:MM-HH:MM" (every day) or "all day"; id is a menu_items id (an override)
//                         or "rule:<Restaurant>:<Category>" (that meal rule and its matching combo rules)
//   combo_contents        "<id> x<n>; <id> x<n>; drink=<id>|<id>; side=<id>" (replaces all parts)
//   combo_entree          "<id>": the meal's entree (replaces its first fixed part, or adds one)
//   combo_part            "<id>" or "<id> x<n>": adds one fixed part (e.g. Panda #4's second entree)
//   combo_side/_drink     "<id>|<id>": the side/drink choices the meal includes, first = default
//   combo_side_choices / combo_drink_choices: same format, extra no-charge options for a meal whose
//                         default is already known (these don't block verification)
export const FILL_IN_KINDS = [
  "price",
  "serving_window",
  "combo_contents",
  "combo_entree",
  "combo_part",
  "combo_side",
  "combo_drink",
  "combo_side_choices",
  "combo_drink_choices"
] as const;
export type FillInKind = (typeof FILL_IN_KINDS)[number];

// Combo rows that must be answered before a combo can be marked verified.
const BLOCKING: FillInKind[] = ["combo_contents", "combo_entree", "combo_part", "combo_side", "combo_drink"];

export interface FillInRow {
  row: number; // 1-based data row
  id: string;
  restaurant: string;
  item: string;
  missing: FillInKind;
  currentNote: string;
  value: string;
  source: string;
}

export type FixedPart = { meal: string; servings: number };
export type SlotPart = { slot: "side" | "drink"; choices: string[]; default: string };
export type ComboEntry = {
  source: string;
  verified: boolean;
  components: (FixedPart | SlotPart)[];
  notes?: string;
};
export type ComboContentsFile = Record<string, ComboEntry>;

type Windows = Record<string, { open: string; close: string }[]> | null | "unknown";
interface WindowRule {
  restaurant: string;
  category?: string;
  description_prefix?: string;
  label: string;
  windows: Windows;
  source: string | null;
  verified: string;
}
export interface ServingWindowsFile {
  _comment?: string;
  timezone: string;
  meal_rules: WindowRule[];
  combo_rules: WindowRule[];
  overrides: { source_id: string; windows: Windows; source: string; verified: string }[];
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const CLOCK = "([01]\\d|2[0-3]):[0-5]\\d";
const WINDOW = new RegExp(`^(${CLOCK})-(${CLOCK})$`);
const PRICE = /^\d+\.\d{2}$/;

// RFC 4180 output with CRLF, quoting only when needed (same as the existing data files).
export function toCsv(rows: string[][]): string {
  const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function parseWindow(value: string): Windows | undefined {
  if (value.trim().toLowerCase() === "all day") return null;
  const match = WINDOW.exec(value.trim());
  if (!match) return undefined;
  const window = { open: match[1] ?? "", close: match[3] ?? "" };
  return Object.fromEntries(DAYS.map((day) => [day, [{ ...window }]])) as Record<string, (typeof window)[]>;
}

const slotPart = (slot: "side" | "drink", choices: string[]): SlotPart => ({
  slot,
  choices,
  default: choices[0] ?? ""
});

const idList = (value: string) =>
  value
    .split("|")
    .map((id) => id.trim())
    .filter(Boolean);

// "<id> x2" -> { meal, servings }
function parsePart(value: string): FixedPart | null {
  const match = /^(\S+)(?:\s+x(\d+(?:\.\d+)?))?$/.exec(value.trim());
  if (!match?.[1]) return null;
  const servings = match[2] === undefined ? 1 : Number(match[2]);
  return servings > 0 ? { meal: match[1], servings } : null;
}

export function parseContents(value: string): (FixedPart | SlotPart)[] | string {
  const parts: (FixedPart | SlotPart)[] = [];
  for (const raw of value.split(";").map((p) => p.trim()).filter(Boolean)) {
    const slot = /^(side|drink)\s*=\s*(.+)$/.exec(raw);
    if (slot) {
      const choices = idList(slot[2] ?? "");
      if (!choices.length) return `"${raw}" lists no choices`;
      parts.push(slotPart(slot[1] as "side" | "drink", choices));
      continue;
    }
    const part = parsePart(raw);
    if (!part) return `"${raw}" is not "<id>" or "<id> x<count>"`;
    parts.push(part);
  }
  return parts.length ? parts : "no parts listed";
}

const partIds = (parts: (FixedPart | SlotPart)[]) =>
  parts.flatMap((part) => ("meal" in part ? [part.meal] : part.choices));

// Clean + validate. Blank rows are fine (still to do); a filled row needs a valid value and a source.
export function readFillIn(
  table: string[][],
  known: { itemIds: Set<string>; comboIds: Set<string>; restaurants: Set<string> }
): { rows: FillInRow[]; problems: Problem[] } {
  const [header, ...body] = table;
  const problems: Problem[] = [];
  const keys = (header ?? []).map((h) => h.replace(/^\uFEFF/, "").trim());
  const missingColumns = FILL_IN_HEADER.filter((column) => !keys.includes(column));
  if (missingColumns.length) {
    problems.push({ row: 0, id: "", message: `missing columns: ${missingColumns.join(", ")}` });
    return { rows: [], problems };
  }
  const rows: FillInRow[] = [];
  const seen = new Set<string>();
  body.forEach((cells, index) => {
    const get = (column: string) => (cells[keys.indexOf(column)] ?? "").trim();
    const row: FillInRow = {
      row: index + 1,
      id: get("id"),
      restaurant: get("restaurant"),
      item: get("item"),
      missing: get("missing") as FillInKind,
      currentNote: get("current_note"),
      value: get("value"),
      source: get("source")
    };
    const fail = (message: string) => problems.push({ row: row.row, id: row.id, message });
    if (!(FILL_IN_KINDS as readonly string[]).includes(row.missing))
      return fail(`unknown "missing" value "${row.missing}"`);
    const key = `${row.id}|${row.missing}`;
    if (seen.has(key)) return fail(`duplicate row for ${row.missing}`);
    seen.add(key);

    // The target must exist, filled or not.
    if (row.missing === "price" && !known.itemIds.has(row.id))
      return fail("matches no id in menu_items.csv");
    if (row.missing === "serving_window") {
      const rule = /^rule:([^:]+):(.+)$/.exec(row.id);
      if (rule ? !known.restaurants.has(rule[1] ?? "") : !known.itemIds.has(row.id))
        return fail('matches no menu item (or "rule:<Restaurant>:<Category>")');
    }
    if (row.missing.startsWith("combo_") && !known.comboIds.has(row.id))
      return fail("matches no combo in combo_contents.json");

    rows.push(row);
    if (!row.value) return;
    if (!row.source) return fail("source is required when value is filled in");

    const unknown = (ids: string[]) => ids.filter((id) => !known.itemIds.has(id));
    switch (row.missing) {
      case "price":
        if (row.value.toLowerCase() === "none") return;
        if (!PRICE.test(row.value) || Number(row.value) <= 0)
          return fail(`price "${row.value}" must be more than 0 with two decimals, e.g. 8.99 (or "none")`);
        return;
      case "serving_window":
        if (parseWindow(row.value) === undefined)
          return fail(`serving window "${row.value}" must be HH:MM-HH:MM or "all day"`);
        return;
      case "combo_contents": {
        const parts = parseContents(row.value);
        if (typeof parts === "string") return fail(parts);
        const bad = unknown(partIds(parts));
        if (bad.length) return fail(`unknown menu item id(s): ${bad.join(", ")}`);
        return;
      }
      case "combo_entree":
      case "combo_part": {
        const part = parsePart(row.value);
        if (!part || (row.missing === "combo_entree" && part.servings !== 1))
          return fail(`"${row.value}" is not ${row.missing === "combo_entree" ? "one menu item id" : '"<id>" or "<id> x<count>"'}`);
        const bad = unknown([part.meal]);
        if (bad.length) return fail(`unknown menu item id(s): ${bad.join(", ")}`);
        return;
      }
      default: {
        const ids = idList(row.value);
        if (!ids.length) return fail("list at least one menu item id");
        const bad = unknown(ids);
        if (bad.length) return fail(`unknown menu item id(s): ${bad.join(", ")}`);
      }
    }
  });
  return { rows, problems };
}

export interface FillInInput {
  items: string[][]; // menu_items.csv table, header first
  windows: ServingWindowsFile;
  contents: ComboContentsFile;
  rows: FillInRow[]; // validated sheet rows
}

export interface FillInResult {
  items: string[][];
  windows: ServingWindowsFile;
  contents: ComboContentsFile;
  applied: FillInRow[];
  remaining: FillInRow[];
  verifiedCombos: string[];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// Transform: merges every filled row; nothing is written here. Inputs are not modified.
export function applyFillIn(input: FillInInput): FillInResult {
  const items = input.items.map((row) => [...row]);
  const windows = clone(input.windows);
  const contents = clone(input.contents);
  const header = items[0] ?? [];
  const col = (name: string) => header.indexOf(name);
  const itemRow = (id: string) => items.find((row, i) => i > 0 && row[col("id")] === id);
  const applied = input.rows.filter((row) => row.value);
  const remaining = input.rows.filter((row) => !row.value);
  const comboSources = new Map<string, string[]>();
  const verified = `Confirmed ${new Date().toISOString().slice(0, 10)} via data/manual_fill_in.csv`;

  for (const row of applied) {
    if (row.missing === "price") {
      const target = itemRow(row.id)!;
      if (row.value.toLowerCase() === "none") {
        const note = `Not sold on its own (${row.source}).`;
        target[col("notes")] = [target[col("notes")], note].filter(Boolean).join(" ");
      } else {
        target[col("price_usd")] = row.value;
        target[col("price_source")] = row.source;
      }
      continue;
    }
    if (row.missing === "serving_window") {
      const value = parseWindow(row.value)!;
      const rule = /^rule:([^:]+):(.+)$/.exec(row.id);
      if (rule) {
        const [, restaurant = "", category = ""] = rule;
        const update = (r: WindowRule) => Object.assign(r, { windows: value, source: row.source, verified });
        const mealRules = windows.meal_rules.filter((r) => r.restaurant === restaurant && r.category === category);
        if (mealRules.length === 0)
          windows.meal_rules.push({ restaurant, category, label: category, windows: value, source: row.source, verified });
        mealRules.forEach(update);
        // Combo rules for the same restaurant and label (e.g. Chick-fil-A "Breakfast meal" combos).
        windows.combo_rules.filter((r) => r.restaurant === restaurant && r.label === category).forEach(update);
      } else {
        windows.overrides = windows.overrides.filter((o) => o.source_id !== row.id);
        windows.overrides.push({ source_id: row.id, windows: value, source: row.source, verified });
      }
      continue;
    }

    const entry = contents[row.id];
    if (!entry) continue; // readFillIn already checked every combo id
    comboSources.set(row.id, [...(comboSources.get(row.id) ?? []), row.source]);
    const fixedIndex = entry.components.findIndex((part) => "meal" in part);
    switch (row.missing) {
      case "combo_contents":
        entry.components = parseContents(row.value) as (FixedPart | SlotPart)[];
        break;
      case "combo_entree": {
        const part = { meal: row.value.trim(), servings: 1 };
        if (fixedIndex >= 0) entry.components[fixedIndex] = part;
        else entry.components.unshift(part);
        break;
      }
      case "combo_part": {
        const part = parsePart(row.value)!;
        // Add after the last fixed part, before any slots.
        const lastFixed = entry.components.reduce((last, p, i) => ("meal" in p ? i : last), -1);
        entry.components.splice(lastFixed + 1, 0, part);
        break;
      }
      default: {
        const slot = row.missing.startsWith("combo_side") ? "side" : "drink";
        const choices = idList(row.value);
        const existing = entry.components.find((p): p is SlotPart => "slot" in p && p.slot === slot);
        if (existing) Object.assign(existing, slotPart(slot, choices));
        else entry.components.push(slotPart(slot, choices));
      }
    }
  }

  // A combo becomes verified once none of its blocking rows are left. Never un-verified here.
  const verifiedCombos: string[] = [];
  for (const [id, sources] of comboSources) {
    const entry = contents[id];
    if (!entry) continue;
    const blocked = remaining.some((row) => row.id === id && BLOCKING.includes(row.missing));
    entry.source = [entry.source, ...new Set(sources)].join("; ");
    if (!blocked && !entry.verified && entry.components.length) {
      entry.verified = true;
      delete entry.notes;
      verifiedCombos.push(id);
    }
  }
  return { items, windows, contents, applied, remaining, verifiedCombos };
}

// The sheet with only the rows still to do.
export function remainingSheet(table: string[][], remaining: FillInRow[]): string[][] {
  const keep = new Set(remaining.map((row) => row.row));
  return [table[0] ?? FILL_IN_HEADER, ...table.slice(1).filter((_, i) => keep.has(i + 1))];
}

const columnValues = (items: string[][], column: string) => {
  const index = (items[0] ?? []).indexOf(column);
  return new Set(items.slice(1).flatMap((row) => (row[index] ? [row[index]] : [])));
};

export const restaurantsOf = (items: string[][]) => columnValues(items, "restaurant");

// What sheet rows may point at: menu_items ids, combo_contents keys, and restaurants (for rules).
export const knownTargets = (items: string[][], contents: ComboContentsFile) => ({
  itemIds: columnValues(items, "id"),
  comboIds: new Set(Object.keys(contents)),
  restaurants: restaurantsOf(items)
});

// For building the sheet: the id used for a restaurant-wide rule row.
export const ruleId = (restaurant: string, category: string) => `rule:${restaurant}:${category}`;
