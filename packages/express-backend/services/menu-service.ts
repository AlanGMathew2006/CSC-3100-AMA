import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MenuCombo,
  MenuItem,
  MenuOffering,
  MenuResponse
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
  } | null;
}

type MealRow = Omit<MenuItem, "offerings"> & {
  offerings: OfferingRow[] | null;
};

// Keeps the most recent available offering for each location.
export function latestOfferings(
  rows: OfferingRow[]
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
      service_date: row.service_date
    });
  }
  return [...byLocation.values()].sort((a, b) =>
    a.location_name.localeCompare(b.location_name)
  );
}

export async function getMenu(
  db: SupabaseClient
): Promise<MenuResponse> {
  const [meals, combos] = await Promise.all([
    db
      .from("meals")
      .select(
        "id, name, restaurant, category, serving, calories, protein_g, carbs_g, fat_g, meal_component, " +
          "offerings:menu_offerings(price, service_date, available, location:dining_locations(id, name, campus_area))"
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
      offerings: latestOfferings(offerings ?? [])
    })
  );
  return { items, combos: combos.data as MenuCombo[] };
}
