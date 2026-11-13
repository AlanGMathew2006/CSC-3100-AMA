// npm run apply:fill-in [-- --dry-run]
// Merges the filled-in rows of data/manual_fill_in.csv into menu_items.csv, serving_windows.json
// and combo_contents.json, and removes them from the sheet. All or nothing: if any row is invalid,
// or the merged files fail the menu import's own checks, nothing is written.
// Afterwards run `npm run import:menu -- --dry-run`, then `npm run import:menu`.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseCsv,
  parseCsvTable,
  toComboContents,
  toComboRecords,
  toItemRecords,
  toServingWindowRules,
  type Problem
} from "./menu-import/pipeline.js";
import {
  applyFillIn,
  knownTargets,
  readFillIn,
  remainingSheet,
  toCsv,
  type ComboContentsFile,
  type ServingWindowsFile
} from "./fill-in/fill-in.js";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../data");
const file = (name: string) => path.join(dataDir, name);
const dryRun = process.argv.includes("--dry-run");

function report(label: string, problems: Problem[]) {
  for (const p of problems) console.error(`  ${label} row ${p.row}${p.id ? ` (${p.id})` : ""}: ${p.message}`);
}

async function main() {
  const read = (name: string) => readFile(file(name), "utf8");
  const [sheetText, itemsText, combosText, windowsText, contentsText] = await Promise.all([
    read("manual_fill_in.csv"),
    read("menu_items.csv"),
    read("menu_combos.csv"),
    read("serving_windows.json"),
    read("combo_contents.json")
  ]);
  const sheet = parseCsvTable(sheetText);
  const items = parseCsvTable(itemsText);
  const contents = JSON.parse(contentsText) as ComboContentsFile;

  const filled = readFillIn(sheet, knownTargets(items, contents));
  if (filled.problems.length) {
    report("manual_fill_in.csv", filled.problems);
    throw new Error("Fix the rows above; nothing was written.");
  }
  const result = applyFillIn({ items, windows: JSON.parse(windowsText) as ServingWindowsFile, contents, rows: filled.rows });
  if (result.applied.length === 0) {
    console.log(`Nothing to apply: ${result.remaining.length} rows still blank in data/manual_fill_in.csv.`);
    return;
  }

  // Same checks as npm run import:menu, on the merged files.
  const itemsCsv = toCsv(result.items);
  const records = toItemRecords(parseCsv(itemsCsv));
  const windows = toServingWindowRules(result.windows);
  const combos = toComboRecords(parseCsv(combosText)).combos;
  const checked = toComboContents(result.contents, records.items.map((item) => item.sourceId), combos);
  report("menu_items.csv", records.problems);
  report("serving_windows.json", windows.problems);
  report("combo_contents.json", checked.problems);
  if (records.problems.length || windows.problems.length || checked.problems.length) {
    throw new Error("The merged files have problems (above); nothing was written.");
  }

  const kinds = new Map<string, number>();
  for (const row of result.applied) kinds.set(row.missing, (kinds.get(row.missing) ?? 0) + 1);
  console.log(`${dryRun ? "Dry run, nothing written. Would apply" : "Applied"} ${result.applied.length} rows:`);
  for (const [kind, count] of kinds) console.log(`  ${kind}: ${count}`);
  for (const id of result.verifiedCombos) console.log(`  combo now verified: ${id}`);
  console.log(`${result.remaining.length} rows left in data/manual_fill_in.csv.`);
  if (dryRun) return;

  await Promise.all([
    writeFile(file("menu_items.csv"), itemsCsv),
    writeFile(file("serving_windows.json"), JSON.stringify(result.windows, null, 2) + "\n"),
    writeFile(file("combo_contents.json"), JSON.stringify(result.contents, null, 2) + "\n"),
    writeFile(file("manual_fill_in.csv"), toCsv(remainingSheet(sheet, result.remaining)))
  ]);
  console.log("Next: npm run import:menu -- --dry-run, then npm run import:menu (from packages/express-backend).");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
