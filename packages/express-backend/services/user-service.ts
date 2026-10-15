import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingInput } from "@csc-3100-ama/shared";

// Data access for user-owned tables. All calls use a user-scoped client, so RLS enforces ownership.

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null };

function unwrap<T>({ data, error }: Result): T {
  if (error) throw error;
  return data as T;
}

function pick<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export interface ProfileInput {
  display_name?: string;
  dining_dollars_balance?: number;
  daily_spending_target?: number;
  onboarding_completed?: boolean;
}

export interface GoalsInput {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
}

export interface PreferencesInput {
  dietary_restrictions?: string[];
  allergens?: string[];
  cuisine_preferences?: string[];
  preferred_location_ids?: string[];
  excluded_foods?: string[];
}

export interface MealLogInput {
  meal_id?: string;
  location_id?: string;
  name: string;
  location_name?: string;
  price?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  eaten_at?: string;
}

export async function getProfile(db: SupabaseClient, userId: string) {
  return unwrap<Row | null>(
    await db.from("profiles").select("*").eq("id", userId).maybeSingle(),
  );
}

export async function updateProfile(
  db: SupabaseClient,
  userId: string,
  fields: ProfileInput,
) {
  const allowed: ProfileInput = {
    display_name: fields.display_name,
    dining_dollars_balance: fields.dining_dollars_balance,
    daily_spending_target: fields.daily_spending_target,
    onboarding_completed: fields.onboarding_completed,
  };
  return unwrap<Row>(
    await db
      .from("profiles")
      .update(pick(allowed))
      .eq("id", userId)
      .select()
      .single(),
  );
}

export async function getGoals(db: SupabaseClient, userId: string) {
  return unwrap<Row | null>(
    await db.from("user_goals").select("*").eq("user_id", userId).maybeSingle(),
  );
}

export async function upsertGoals(
  db: SupabaseClient,
  userId: string,
  fields: GoalsInput,
) {
  const allowed: GoalsInput = {
    calories: fields.calories,
    protein_g: fields.protein_g,
    carbs_g: fields.carbs_g,
    fat_g: fields.fat_g,
    fiber_g: fields.fiber_g,
  };
  return unwrap<Row>(
    await db
      .from("user_goals")
      .upsert({ user_id: userId, ...pick(allowed) })
      .select()
      .single(),
  );
}

export async function completeOnboarding(
  db: SupabaseClient,
  fields: OnboardingInput,
) {
  return unwrap<null>(
    await db.rpc("complete_onboarding", {
      p_dining_dollars_balance: fields.dining_dollars_balance,
      p_daily_spending_target: fields.daily_spending_target,
      p_calories: fields.calories,
      p_protein_g: fields.protein_g,
      p_carbs_g: fields.carbs_g,
      p_fat_g: fields.fat_g,
    }),
  );
}

export async function getPreferences(db: SupabaseClient, userId: string) {
  return unwrap<Row | null>(
    await db
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  );
}

export async function upsertPreferences(
  db: SupabaseClient,
  userId: string,
  fields: PreferencesInput,
) {
  const allowed: PreferencesInput = {
    dietary_restrictions: fields.dietary_restrictions,
    allergens: fields.allergens,
    cuisine_preferences: fields.cuisine_preferences,
    preferred_location_ids: fields.preferred_location_ids,
    excluded_foods: fields.excluded_foods,
  };
  return unwrap<Row>(
    await db
      .from("user_preferences")
      .upsert({ user_id: userId, ...pick(allowed) })
      .select()
      .single(),
  );
}

export async function listLocations(db: SupabaseClient) {
  return unwrap<Row[]>(
    await db.from("dining_locations").select("*").order("name"),
  );
}

export async function listOfferings(
  db: SupabaseClient,
  { locationId, serviceDate }: { locationId?: string; serviceDate?: string },
) {
  let query = db
    .from("menu_offerings")
    .select("*, meal:meals(*), location:dining_locations(id, name, hours)")
    .eq("available", true)
    .eq("service_date", serviceDate ?? new Date().toISOString().slice(0, 10));
  if (locationId) query = query.eq("location_id", locationId);
  return unwrap<Row[]>(await query);
}

export async function listMealLogs(
  db: SupabaseClient,
  userId: string,
  { from, to }: { from?: string; to?: string } = {},
) {
  let query = db
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .order("eaten_at", { ascending: false });
  if (from) query = query.gte("eaten_at", from);
  if (to) query = query.lte("eaten_at", to);
  return unwrap<Row[]>(await query);
}

export async function createMealLog(
  db: SupabaseClient,
  userId: string,
  fields: MealLogInput,
) {
  const allowed: MealLogInput = {
    meal_id: fields.meal_id,
    location_id: fields.location_id,
    name: fields.name,
    location_name: fields.location_name,
    price: fields.price,
    calories: fields.calories,
    protein_g: fields.protein_g,
    carbs_g: fields.carbs_g,
    fat_g: fields.fat_g,
    fiber_g: fields.fiber_g,
    eaten_at: fields.eaten_at,
  };
  return unwrap<Row>(
    await db
      .from("meal_logs")
      .insert({ user_id: userId, ...pick(allowed) })
      .select()
      .single(),
  );
}

export async function deleteMealLog(
  db: SupabaseClient,
  userId: string,
  logId: string,
) {
  unwrap<unknown>(
    await db.from("meal_logs").delete().eq("user_id", userId).eq("id", logId),
  );
}

export interface Totals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  spent: number;
}

function sumLogs(logs: Row[]): Totals {
  const totals: Totals = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    spent: 0,
  };
  for (const log of logs) {
    totals.calories += Number(log.calories ?? 0);
    totals.protein_g += Number(log.protein_g ?? 0);
    totals.carbs_g += Number(log.carbs_g ?? 0);
    totals.fat_g += Number(log.fat_g ?? 0);
    totals.fiber_g += Number(log.fiber_g ?? 0);
    totals.spent += Number(log.price ?? 0);
  }
  return totals;
}

// Profile, goals and daily/weekly progress in one call. The client sends its own
// local day/week boundaries so "today" matches the student's timezone.
export async function getDashboard(
  db: SupabaseClient,
  userId: string,
  { dayStart, weekStart }: { dayStart: string; weekStart: string },
) {
  const [profile, goals, weekLogs] = await Promise.all([
    getProfile(db, userId),
    getGoals(db, userId),
    listMealLogs(db, userId, { from: weekStart }),
  ]);
  const dayMs = Date.parse(dayStart);
  const todayLogs = weekLogs.filter(
    (log) => Date.parse(String(log.eaten_at)) >= dayMs,
  );
  return {
    profile,
    goals,
    today: sumLogs(todayLogs),
    week: sumLogs(weekLogs),
    recent_logs: todayLogs,
  };
}

export async function listSavedMeals(db: SupabaseClient, userId: string) {
  return unwrap<Row[]>(
    await db
      .from("saved_meals")
      .select("created_at, meal:meals(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
}

export async function saveMeal(
  db: SupabaseClient,
  userId: string,
  mealId: string,
) {
  return unwrap<Row>(
    await db
      .from("saved_meals")
      .upsert({ user_id: userId, meal_id: mealId })
      .select()
      .single(),
  );
}

export async function unsaveMeal(
  db: SupabaseClient,
  userId: string,
  mealId: string,
) {
  unwrap<unknown>(
    await db
      .from("saved_meals")
      .delete()
      .eq("user_id", userId)
      .eq("meal_id", mealId),
  );
}
