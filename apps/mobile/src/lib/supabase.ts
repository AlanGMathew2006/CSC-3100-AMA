import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { supabaseConfig } from "../config";

// Null when the env vars are missing, so we never talk to a made-up project.
// The session lives in AsyncStorage on the device and the client refreshes it.
export const supabase: SupabaseClient | null = supabaseConfig
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // no URL-based sessions on native (deep links are phase 4)
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// Refresh tokens only while the app is in the foreground, and check right away
// when the app comes back (timers don't run in the background).
export function watchAppStateForTokenRefresh(): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  if (AppState.currentState === "active") client.auth.startAutoRefresh();
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
  return () => {
    subscription.remove();
    client.auth.stopAutoRefresh();
  };
}
