import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOpenStatus,
  keepOpenOfferings,
  type MenuCombo,
  type MenuItem,
  type MenuOffering,
  type MenuResponse,
  type WeeklyHours
} from "@csc-3100-ama/shared";

// Read-only access to the imported campus menu (meals, menu_offerings, menu_combos).

interface OfferingRow {
  price: number;
  service_date: string;
  available: boolean;
  location: {
    id: string;
    name: string;
    campus_area: string | null;
    hours?: WeeklyHours | null;
  } | null;
}

type MealRow = Omit<MenuItem, "offerings"> & {
  offerings: OfferingRow[] | null;
};

// Keeps the most recent available offering for each location,
// marked open/closed/unknown from the location's hours at `at`.
export function latestOfferings(
  rows: OfferingRow[],
  at: Date = new Date()
): MenuOffering[] {
  const byLocation = new Map<string, MenuOffering>();
  for (const row of rows) {
    if (!row.available || !row.location) continue;
    const current = byLocation.get(row.location.id);
    if (current && current.service_date >= row.service_date)
      continue;
    byLocation.set(row.location.id, {
      location_id: row.location.id,
      location_name: row.location.name,
      campus_area: row.location.campus_area,
      price: Number(row.price),
      service_date: row.service_date,
      open_status: getOpenStatus(row.location.hours, at)
    });
  }
  return [...byLocation.values()].sort((a, b) =>
    a.location_name.localeCompare(b.location_name)
  );
}

export interface MenuOptions {
  // Drop offerings at closed locations; offerings with unknown hours are kept.
  openNow?: boolean;
  at?: Date;
}

export async function getMenu(
  db: SupabaseClient,
  { openNow = false, at = new Date() }: MenuOptions = {}
): Promise<MenuResponse> {
  const [meals, combos] = await Promise.all([
    db
      .from("meals")
      .select(
        "id, name, restaurant, category, serving, calories, protein_g, carbs_g, fat_g, meal_component, tags, " +
          "offerings:menu_offerings(price, service_date, available, location:dining_locations(id, name, campus_area, hours))"
      )
      .not("restaurant", "is", null)
      .order("restaurant")
      .order("category")
      .order("name"),
    db
      .from("menu_combos")
      .select(
        "id, restaurant, name, description, base_count, entree_count, price"
      )
      .order("restaurant")
      .order("price")
  ]);
  if (meals.error) throw meals.error;
  if (combos.error) throw combos.error;

  const items = (meals.data as unknown as MealRow[]).map(
    ({ offerings, ...meal }) => ({
      ...meal,
      offerings: latestOfferings(offerings ?? [], at)
    })
  );
  return {
    items: openNow ? keepOpenOfferings(items) : items,
    combos: combos.data as MenuCombo[]
  };
}
