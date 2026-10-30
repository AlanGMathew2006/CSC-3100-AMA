import type { SupabaseClient } from "@supabase/supabase-js";
import {
  combineAvailability,
  compareAvailability,
  getItemAvailability,
  getOpenStatus,
  keepOpenOfferings,
  type ItemAvailability,
  type MenuCombo,
  type MenuItem,
  type MenuLocationStatus,
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

export interface LocationRecord {
  id: string;
  name: string;
  restaurant: string | null;
  campus_area: string | null;
  hours: WeeklyHours | null;
}

// For things with no offering of their own (unpriced items, combo-only Panda parts, combos): the
// restaurant's locations with their status, best availability first, and the overall availability.
// With no known location, the item's own serving window still decides (a closed window is not_now).
export function restaurantAvailability(
  restaurant: string,
  servingWindows: ServingWindows | undefined,
  locations: LocationRecord[],
  at: Date
): { locations: MenuLocationStatus[]; availability: ItemAvailability } {
  const statuses = locations
    .filter((location) => location.restaurant === restaurant)
    .map((location) => ({
      location_id: location.id,
      location_name: location.name,
      campus_area: location.campus_area,
      open_status: getOpenStatus(location.hours, at),
      availability: getItemAvailability(servingWindows, location.hours, at)
    }))
    .sort(
      (a, b) =>
        compareAvailability(a.availability, b.availability) ||
        a.location_name.localeCompare(b.location_name)
    );
  return {
    locations: statuses,
    availability:
      combineAvailability(statuses.map((s) => s.availability)) ??
      getItemAvailability(servingWindows, null, at)
  };
}

// A combo is sold at every location of its restaurant: available if any of them serves it now.
export const comboAvailability = (
  combo: Pick<MenuCombo, "restaurant" | "serving_windows">,
  locations: LocationRecord[],
  at: Date
): ItemAvailability =>
  restaurantAvailability(combo.restaurant, combo.serving_windows, locations, at)
    .availability;

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
    db
      .from("dining_locations")
      .select("id, name, restaurant, campus_area, hours")
      .order("name")
  ]);
  if (meals.error) throw meals.error;
  if (combos.error) throw combos.error;
  if (locations.error) throw locations.error;

  const locationRows = (locations.data ?? []) as LocationRecord[];
  const items: MenuItem[] = (meals.data as unknown as MealRow[]).map(
    ({ offerings, ...meal }) => {
      const latest = latestOfferings(
        offerings ?? [],
        at,
        meal.serving_windows ?? null
      );
      if (latest.length) return { ...meal, offerings: latest };
      // No price anywhere: fall back to the restaurant's locations for label, badge and availability.
      const fallback = restaurantAvailability(
        meal.restaurant,
        meal.serving_windows,
        locationRows,
        at
      );
      return {
        ...meal,
        offerings: [],
        restaurant_locations: fallback.locations,
        availability: fallback.availability
      };
    }
  );
  const allCombos = (combos.data as MenuCombo[]).map((combo) => {
    const { locations: comboLocations, availability } = restaurantAvailability(
      combo.restaurant,
      combo.serving_windows,
      locationRows,
      at
    );
    return { ...combo, locations: comboLocations, availability };
  });
  return {
    items: openNow ? keepOpenOfferings(items) : items,
    combos: openNow
      ? allCombos.filter((combo) => combo.availability !== "not_now")
      : allCombos
  };
}
