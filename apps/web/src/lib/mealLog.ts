import {
  sumMacros,
  type ItemAvailability,
  type MenuCombo,
  type MenuItem,
  type OpenStatus,
} from "@csc-3100-ama/shared";
import type { MealLogInput } from "../types/dashboard";
import { errorMessage } from "./errors";

// A place an item can be logged from, with its price there (null = no price at that location).
export interface LogLocation {
  location_id: string;
  location_name: string;
  campus_area: string | null;
  price: number | null;
  open_status: OpenStatus;
  availability: ItemAvailability;
}

// Every location with a price, or for an item with no price anywhere (unpriced, Panda combo-only)
// its restaurant's locations, unpriced.
export function logLocations(item: MenuItem): LogLocation[] {
  if (item.offerings.length) {
    return item.offerings.map((offering) => ({
      location_id: offering.location_id,
      location_name: offering.location_name,
      campus_area: offering.campus_area,
      price: offering.price,
      open_status: offering.open_status,
      availability: offering.availability,
    }));
  }
  return (item.restaurant_locations ?? []).map((location) => ({ ...location, price: null }));
}

const AVAILABILITY_RANK: Record<ItemAvailability, number> = { available: 0, unknown: 1, not_now: 2 };

// The first location serving the item now, then one with unknown hours, then anything.
export function defaultLogLocation(locations: LogLocation[]): LogLocation | null {
  return locations.reduce<LogLocation | null>(
    (best, location) =>
      best == null || AVAILABILITY_RANK[location.availability] < AVAILABILITY_RANK[best.availability]
        ? location
        : best,
    null,
  );
}

const macro = (value: number | null | undefined) => (value == null ? undefined : Number(value));

// One item logged at one location. The price comes from that location's offering; an item with
// no price there is logged without one (not counted toward spending). Unknown macros stay
// undefined, never 0.
export function mealLogFromItem(item: MenuItem, locationId?: string): MealLogInput {
  const location = logLocations(item).find((l) => l.location_id === locationId);
  return {
    meal_id: item.id,
    location_id: location?.location_id,
    name: item.name,
    location_name: location?.location_name,
    price: location?.price ?? undefined,
    calories: macro(item.calories),
    protein_g: macro(item.protein_g),
    carbs_g: macro(item.carbs_g),
    fat_g: macro(item.fat_g),
  };
}

export const UNPRICED_LOG_NOTE = "Price unavailable, not counted toward spending";
export const FREE_WITH_MEAL = "Free with a meal";
export const FREE_WITH_MEAL_LOG_NOTE = "Free with a meal, not counted toward spending";

// What to show where a price would go: the price, "Free with a meal" for sauces etc. that come
// with a meal (data/menu_items.csv free_with_meal), or "Price unavailable".
export function priceText(item: Pick<MenuItem, "free_with_meal">, price: number | null | undefined): string {
  if (price != null) return `$${price.toFixed(2)}`;
  return item.free_with_meal ? FREE_WITH_MEAL : "Price unavailable";
}

// The note under Add to Today (and in the toast) when the item is logged without a price.
export const unpricedLogNote = (item: Pick<MenuItem, "free_with_meal">) =>
  item.free_with_meal ? FREE_WITH_MEAL_LOG_NOTE : UNPRICED_LOG_NOTE;

export interface ComboPick {
  item: MenuItem;
  servings: number; // 0.5 for each half of a half-and-half base
}

// "Plate: Chow Mein + Orange Chicken + Broccoli Beef" in the order picked; the same item picked
// twice shows as "2× Orange Chicken". Half-and-half bases are listed by name.
export function comboLogName(comboName: string, picks: ComboPick[]): string {
  const merged = new Map<string, { name: string; servings: number }>();
  for (const { item, servings } of picks) {
    const current = merged.get(item.id);
    if (current) current.servings += servings;
    else merged.set(item.id, { name: item.name, servings });
  }
  const parts = [...merged.values()].map(({ name, servings }) =>
    servings >= 2 ? `${servings}× ${name}` : name,
  );
  return parts.length ? `${comboName}: ${parts.join(" + ")}` : comboName;
}

// A combo is logged as one entry at the combo price, at the restaurant's best location. Without
// picks (contents unknown) only the name and price are logged; nutrition stays unavailable.
export function comboLog(combo: MenuCombo, picks: ComboPick[] | null): MealLogInput {
  const location = combo.locations?.[0];
  const totals = picks ? sumMacros(picks) : null;
  return {
    location_id: location?.location_id,
    name: picks ? comboLogName(combo.name, picks) : combo.name,
    location_name: location?.location_name,
    price: Number(combo.price),
    calories: totals?.calories ?? undefined,
    protein_g: totals?.protein_g ?? undefined,
    carbs_g: totals?.carbs_g ?? undefined,
    fat_g: totals?.fat_g ?? undefined,
  };
}

// Sends one log; returns null on success or the error message to show.
export async function submitMealLog(
  meal: MealLogInput,
  send: (meal: MealLogInput) => Promise<unknown>,
): Promise<string | null> {
  try {
    await send(meal);
    return null;
  } catch (err) {
    return errorMessage(err);
  }
}
