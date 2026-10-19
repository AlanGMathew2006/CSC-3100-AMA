// Imports the collected campus menu (data/menu_items.csv, data/menu_combos.csv) into Supabase.
//
//   npm run import:menu -- --dry-run   # check the CSVs and print what would be written
//   npm run import:menu                # write to Supabase (needs SUPABASE_SERVICE_ROLE_KEY in .env)
//
// Safe to re-run: every write is an upsert on a stable key, so nothing is duplicated.
// Pass --data-dir <path> to read the CSVs from somewhere other than the repo's data/ folder.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildImportPlan,
  parseCsv,
  toComboRecords,
  toItemRecords,
  type ImportPlan,
  type Problem
} from "./menu-import/pipeline.js";

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
  console.log(`  dining_locations: ${plan.locations.length}`);
  for (const location of plan.locations)
    console.log(`    - ${location.name}`);
  console.log(
    `  meals:            ${plan.meals.length} (${plan.unpricedMeals} without a standalone price)`
  );
  console.log(`  menu_offerings:   ${plan.offerings.length}`);
  console.log(`  menu_combos:      ${plan.combos.length}`);
}

function check<T>(
  {
    data,
    error
  }: { data: T; error: { message: string } | null },
  step: string
): T {
  if (error)
    throw new Error(`${step} failed: ${error.message}`);
  return data;
}

async function load(db: SupabaseClient, plan: ImportPlan) {
  const locations = check(
    await db
      .from("dining_locations")
      .upsert(plan.locations, { onConflict: "name" })
      .select("id, name"),
    "Upserting dining_locations"
  ) as { id: string; name: string }[];
  const locationIds = new Map(
    locations.map((row) => [row.name, row.id])
  );

  const meals = check(
    await db
      .from("meals")
      .upsert(plan.meals, { onConflict: "source_id" })
      .select("id, source_id"),
    "Upserting meals"
  ) as { id: string; source_id: string }[];
  const mealIds = new Map(
    meals.map((row) => [row.source_id, row.id])
  );

  const offerings = plan.offerings.map(
    ({ meal_source_id, location_name, ...rest }) => {
      const meal_id = mealIds.get(meal_source_id);
      const location_id = locationIds.get(location_name);
      if (!meal_id || !location_id) {
        throw new Error(
          `Missing id for offering ${meal_source_id} at ${location_name}`
        );
      }
      return {
        ...rest,
        meal_id,
        location_id,
        last_synced_at: new Date().toISOString()
      };
    }
  );
  check(
    await db
      .from("menu_offerings")
      .upsert(offerings, {
        onConflict: "meal_id,location_id,service_date"
      }),
    "Upserting menu_offerings"
  );

  check(
    await db
      .from("menu_combos")
      .upsert(plan.combos, { onConflict: "source_id" }),
    "Upserting menu_combos"
  );
}

async function main() {
  console.log(`Reading menu CSVs from ${dataDir}`);
  const [itemsCsv, combosCsv] = await Promise.all([
    readFile(path.join(dataDir, "menu_items.csv"), "utf8"),
    readFile(path.join(dataDir, "menu_combos.csv"), "utf8")
  ]);

  const { items, problems: itemProblems } = toItemRecords(
    parseCsv(itemsCsv)
  );
  const { combos, problems: comboProblems } = toComboRecords(
    parseCsv(combosCsv)
  );
  reportProblems("menu_items.csv", itemProblems);
  reportProblems("menu_combos.csv", comboProblems);

  const plan = buildImportPlan(items, combos);
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
