// Imports the collected campus menu (data/menu_items.csv, data/menu_combos.csv) and
// location hours (data/dining_hours.json), item serving windows (data/serving_windows.json) and
// meal roles (data/meal_roles.json) into Supabase.
//
//   npm run import:menu -- --dry-run   # check the CSVs and print what would be written
//   npm run import:menu                # write to Supabase (needs SUPABASE_SERVICE_ROLE_KEY in .env)
//
// Safe to re-run: every write is an upsert on a stable key, so nothing is duplicated.
// Pass --data-dir <path> to read the data files from somewhere other than the repo's data/ folder.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMealRoles,
  applyServingWindows,
  buildImportPlan,
  parseCsv,
  toComboRecords,
  toHoursRecords,
  toItemRecords,
  toMealRoleRules,
  toServingWindowRules,
  type ImportPlan,
  type Problem
} from "./menu-import/pipeline.js";
import { load } from "./menu-import/load.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dataDirFlag = args.indexOf("--data-dir");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir =
  dataDirFlag >= 0 && args[dataDirFlag + 1]
    ? path.resolve(args[dataDirFlag + 1] as string)
    : path.resolve(scriptDir, "../../../data");

function reportProblems(label: string, problems: Problem[]) {
  for (const p of problems) {
    console.warn(
      `  skipped ${label} row ${p.row}${p.id ? ` (${p.id})` : ""}: ${p.message}`
    );
  }
}

function summarize(plan: ImportPlan) {
  console.log(
    `  dining_locations: ${plan.locations.length} (${plan.locationsWithoutHours.length} without verified hours)`
  );
  for (const location of plan.locations) {
    const hours = Object.keys(location.hours).length
      ? "hours set"
      : "hours unknown";
    console.log(`    - ${location.name} (${hours})`);
  }
  console.log(
    `  meals:            ${plan.meals.length} (${plan.unpricedMeals} without a standalone price)`
  );
  console.log(
    `                    ${plan.meals.filter((meal) => meal.allergens_verified).length} with verified allergens`
  );
  const windowed = (rows: { serving_windows: unknown }[]) =>
    rows.filter((row) => row.serving_windows !== null).length;
  console.log(
    `                    ${windowed(plan.meals)} with a serving window (${plan.meals.filter((m) => m.serving_windows === "unknown").length} unknown)`
  );
  console.log(`  menu_offerings:   ${plan.offerings.length}`);
  console.log(
    `  menu_combos:      ${plan.combos.length} (${windowed(plan.combos)} with a serving window)`
  );
}

async function main() {
  console.log(`Reading menu data from ${dataDir}`);
  const [itemsCsv, combosCsv, hoursJson, windowsJson, rolesJson] = await Promise.all([
    readFile(path.join(dataDir, "menu_items.csv"), "utf8"),
    readFile(path.join(dataDir, "menu_combos.csv"), "utf8"),
    readFile(path.join(dataDir, "dining_hours.json"), "utf8"),
    readFile(path.join(dataDir, "serving_windows.json"), "utf8"),
    readFile(path.join(dataDir, "meal_roles.json"), "utf8")
  ]);

  const { items, problems: itemProblems } = toItemRecords(
    parseCsv(itemsCsv)
  );
  const { combos, problems: comboProblems } = toComboRecords(
    parseCsv(combosCsv)
  );
  const { hours, problems: hoursProblems } = toHoursRecords(
    JSON.parse(hoursJson)
  );
  reportProblems("menu_items.csv", itemProblems);
  reportProblems("menu_combos.csv", comboProblems);
  const { rules: windowRules, problems: windowProblems } =
    toServingWindowRules(JSON.parse(windowsJson));
  reportProblems("dining_hours.json", hoursProblems);
  const { rules: roleRules, problems: roleProblems } = toMealRoleRules(
    JSON.parse(rolesJson)
  );
  reportProblems("serving_windows.json", windowProblems);
  reportProblems("meal_roles.json", roleProblems);

  const windowed = applyServingWindows(
    buildImportPlan(items, combos, hours),
    windowRules
  );
  for (const name of windowed.unmatched)
    console.warn(`  serving_windows.json ${name} matched no rows`);
  const roles = applyMealRoles(windowed.plan, roleRules);
  for (const id of roles.unmatched)
    console.warn(`  meal_roles.json override ${id} matches no meal`);
  // Every meal needs a role, or the recommender can't tell a meal from a dessert.
  if (roles.missing.length || roleProblems.length) {
    throw new Error(
      `meal_roles.json: fix the problems above${roles.missing.length ? `; no role for ${roles.missing.join(", ")}` : ""}`
    );
  }
  const plan = roles.plan;
  for (const name of plan.unmatchedHours)
    console.warn(
      `  dining_hours.json has "${name}", which matches no location in menu_items.csv`
    );
  console.log(
    dryRun
      ? "Dry run, nothing written. Would upsert:"
      : "Upserting:"
  );
  summarize(plan);
  if (dryRun) return;

  // Imported lazily so --dry-run works without a .env file.
  const { createAdminClient } =
    await import("../services/supabase.js");
  await load(createAdminClient(), plan);
  console.log("Menu import finished.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
