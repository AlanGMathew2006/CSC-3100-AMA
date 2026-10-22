export interface Profile {
  id: string;
  display_name: string | null;
  dining_dollars_balance: number;
  daily_spending_target: number | null;
  onboarding_completed: boolean;
}

export interface Goals {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
}

export interface Totals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  spent: number;
}

export interface DashboardData {
  profile: Profile | null;
  goals: Goals | null;
  today: Totals;
  week: Totals;
  recent_logs?: MealLogInput[];
  week_logs?: MealLogInput[];
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

export interface ProfileInput {
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

export interface UserPreferences {
  dietary_restrictions: string[];
  allergens: string[];
  cuisine_preferences: string[];
  preferred_location_ids: string[];
  excluded_foods: string[];
  nutrition_priorities: string[];
  budget_alerts_enabled: boolean;
  theme: "light" | "dark";
}

export interface DiningLocation {
  id: string;
  name: string;
  restaurant: string | null;
  campus_area: string | null;
}

export interface SavedMeal {
  created_at: string;
  meal: {
    id: string;
    name: string;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    fiber_g: number | null;
  } | null;
}
