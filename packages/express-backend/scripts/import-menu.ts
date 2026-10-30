// Imports the collected campus menu (data/menu_items.csv, data/menu_combos.csv) and
// location hours (data/dining_hours.json) into Supabase.
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
  buildImportPlan,
  parseCsv,
  toComboRecords,
  toHoursRecords,
  toItemRecords,
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
  console.log(`  menu_offerings:   ${plan.offerings.length}`);
  console.log(`  menu_combos:      ${plan.combos.length}`);
}

async function main() {
  console.log(`Reading menu data from ${dataDir}`);
  const [itemsCsv, combosCsv, hoursJson] = await Promise.all([
    readFile(path.join(dataDir, "menu_items.csv"), "utf8"),
    readFile(path.join(dataDir, "menu_combos.csv"), "utf8"),
    readFile(path.join(dataDir, "dining_hours.json"), "utf8")
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
  reportProblems("dining_hours.json", hoursProblems);

  const plan = buildImportPlan(items, combos, hours);
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
