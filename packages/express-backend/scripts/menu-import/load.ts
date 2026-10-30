// Load stage of the menu import: writes an ImportPlan to Supabase.
// Every write is an upsert on a stable key (location name, meal source_id,
// meal+location+date, combo source_id), so re-running never creates duplicates.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportPlan } from "./pipeline.js";

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

export async function load(db: SupabaseClient, plan: ImportPlan) {
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
