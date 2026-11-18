import { API_URL } from "../config";
import { createApiClient } from "./apiClient";
import { requireSupabase } from "./supabase";

// The app's API client, wired to the Supabase session on the device.
export const api = createApiClient({
  baseUrl: API_URL,
  async getAccessToken() {
    const { data } = await requireSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  },
  async refreshAccessToken() {
    const { data, error } = await requireSupabase().auth.refreshSession();
    return error || !data.session ? null : data.session.access_token;
  },
  async signOutLocal() {
    const { error } = await requireSupabase().auth.signOut({ scope: "local" });
    if (error) throw error;
  },
});
