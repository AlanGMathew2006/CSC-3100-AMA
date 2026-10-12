import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Falls back to the VITE_ names used in the existing .env.
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.",
  );
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

// Client acting as the signed-in user, so Row Level Security applies.
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(url as string, publishableKey as string, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Service-role client bypasses RLS. Use only in protected server-side jobs (e.g. menu sync).
export function createAdminClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(url as string, serviceKey, clientOptions);
}
