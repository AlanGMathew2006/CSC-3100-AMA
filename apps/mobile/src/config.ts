// Read from apps/mobile/.env (see .env.example). Expo inlines EXPO_PUBLIC_*
// variables at bundle time, so restart `expo start` after changing them.
// Only public values belong here: never the Supabase service-role key.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfig =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
    : null;

export const MISSING_CONFIG_MESSAGE =
  "Supabase isn't configured. Copy apps/mobile/.env.example to apps/mobile/.env, fill in the values, and restart Expo.";
