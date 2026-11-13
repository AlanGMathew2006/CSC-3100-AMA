// Checks on the real data/menu_items.csv (not fixtures): allergen and dietary-tag data must stay
// consistent as rows are verified by hand.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ALLERGENS, DIETARY_TAGS } from "@csc-3100-ama/shared";
import { parseCsv } from "./pipeline.js";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../data");
const rows = parseCsv(readFileSync(path.join(dataDir, "menu_items.csv"), "utf8"));
const list = (value: string | undefined) =>
  (value ?? "")
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);

test("menu_items.csv: every allergen and tag token is from the allowed lists", () => {
  const badAllergens = rows.flatMap((row) =>
    list(row.allergens)
      .filter((token) => !(ALLERGENS as readonly string[]).includes(token))
      .map((token) => `${row.id}: ${token}`)
  );
  const badTags = rows.flatMap((row) =>
    list(row.tags)
      .filter((token) => !(DIETARY_TAGS as readonly string[]).includes(token))
      .map((token) => `${row.id}: ${token}`)
  );
  assert.deepEqual(badAllergens, []);
  assert.deepEqual(badTags, []);
});

test("menu_items.csv: allergens_verified is yes/no and every verified row cites a source", () => {
  assert.deepEqual(
    rows.filter((row) => !["yes", "no"].includes(row.allergens_verified ?? "")).map((row) => row.id),
    []
  );
  assert.deepEqual(
    rows
      .filter((row) => row.allergens_verified === "yes" && !(row.allergen_source ?? "").trim())
      .map((row) => row.id),
    []
  );
});

test("menu_items.csv: allergens and tags are only set on verified rows", () => {
  assert.deepEqual(
    rows
      .filter(
        (row) =>
          row.allergens_verified !== "yes" && (list(row.allergens).length || list(row.tags).length)
      )
      .map((row) => row.id),
    []
  );
});

test("menu_items.csv: no vegan item contains milk or egg, and no gluten_free item contains wheat", () => {
  const veganWithAnimal = rows
    .filter((row) => list(row.tags).includes("vegan"))
    .filter((row) => list(row.allergens).some((a) => a === "milk" || a === "egg"))
    .map((row) => row.id);
  const glutenFreeWithWheat = rows
    .filter((row) => list(row.tags).includes("gluten_free") && list(row.allergens).includes("wheat"))
    .map((row) => row.id);
  assert.deepEqual(veganWithAnimal, []);
  assert.deepEqual(glutenFreeWithWheat, []);
});

test("menu_items.csv: no item is tagged both vegetarian/vegan and contains_pork", () => {
  assert.deepEqual(
    rows
      .filter((row) => {
        const tags = list(row.tags);
        return tags.includes("contains_pork") && (tags.includes("vegetarian") || tags.includes("vegan"));
      })
      .map((row) => row.id),
    []
  );
});

test("menu_items.csv: allergen counts per chain match DATA_TODO", () => {
  const verified = (restaurant: string) =>
    rows.filter((row) => row.restaurant === restaurant && row.allergens_verified === "yes").length;
  // Update these together with the verified count in data/DATA_TODO.md.
  assert.equal(verified("Chick-fil-A"), 76);
  assert.equal(verified("Taco Bell"), 32);
  assert.equal(verified("Subway"), 12);
  assert.equal(verified("Panda Express"), 0);
});
