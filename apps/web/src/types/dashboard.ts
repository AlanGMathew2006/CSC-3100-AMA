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
}

export interface MealLogInput {
  name: string;
  location_name?: string;
  price?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
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
