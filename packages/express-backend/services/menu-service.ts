import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getItemAvailability,
  getOpenStatus,
  keepOpenOfferings,
  type ItemAvailability,
  type MenuCombo,
  type MenuItem,
  type MenuOffering,
  type MenuResponse,
  type ServingWindows,
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

// Keeps the most recent available offering for each location, marked open/closed/unknown from
// the location's hours at `at`, and whether the item itself is served then (`servingWindows`).
export function latestOfferings(
  rows: OfferingRow[],
  at: Date = new Date(),
  servingWindows: ServingWindows = null
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
      open_status: getOpenStatus(row.location.hours, at),
      availability: getItemAvailability(
        servingWindows,
        row.location.hours,
        at
      )
    });
  }
  return [...byLocation.values()].sort((a, b) =>
    a.location_name.localeCompare(b.location_name)
  );
}

// A combo is sold at every location of its restaurant: available if any of them serves it now.
export function comboAvailability(
  combo: Pick<MenuCombo, "restaurant" | "serving_windows">,
  locations: { restaurant: string | null; hours: WeeklyHours | null }[],
  at: Date
): ItemAvailability {
  const statuses = locations
    .filter((location) => location.restaurant === combo.restaurant)
    .map((location) =>
      getItemAvailability(combo.serving_windows, location.hours, at)
    );
  if (statuses.includes("available")) return "available";
  if (statuses.length === 0 || statuses.includes("unknown"))
    return "unknown";
  return "not_now";
}

export interface MenuOptions {
  // Drop offerings and combos that aren't served right now; unknown ones are kept (marked).
  openNow?: boolean;
  at?: Date;
}

export async function getMenu(
  db: SupabaseClient,
  { openNow = false, at = new Date() }: MenuOptions = {}
): Promise<MenuResponse> {
  const [meals, combos, locations] = await Promise.all([
    db
      .from("meals")
      .select(
        "id, name, restaurant, category, serving, calories, protein_g, carbs_g, fat_g, meal_component, tags, " +
          "allergens, allergens_verified, serving_windows, meal_role, " +
          "offerings:menu_offerings(price, service_date, available, location:dining_locations(id, name, campus_area, hours))"
      )
      .not("restaurant", "is", null)
      .order("restaurant")
      .order("category")
      .order("name"),
    db
      .from("menu_combos")
      .select(
        "id, restaurant, name, description, base_count, entree_count, price, serving_windows"
      )
      .order("restaurant")
      .order("price"),
    db.from("dining_locations").select("restaurant, hours")
  ]);
  if (meals.error) throw meals.error;
  if (combos.error) throw combos.error;
  if (locations.error) throw locations.error;

  const items = (meals.data as unknown as MealRow[]).map(
    ({ offerings, ...meal }) => ({
      ...meal,
      offerings: latestOfferings(
        offerings ?? [],
        at,
        meal.serving_windows ?? null
      )
    })
  );
  const locationHours = (locations.data ?? []) as {
    restaurant: string | null;
    hours: WeeklyHours | null;
  }[];
  const allCombos = (combos.data as MenuCombo[]).map((combo) => ({
    ...combo,
    availability: comboAvailability(combo, locationHours, at)
  }));
  return {
    items: openNow ? keepOpenOfferings(items) : items,
    combos: openNow
      ? allCombos.filter((combo) => combo.availability !== "not_now")
      : allCombos
  };
}
