import { vi, type Mock } from "vitest";

// Shared fake Supabase client for the auth tests. A test file mounts it with
//   vi.mock("./lib/supabase", async () => (await import("./test/mockSupabase")).supabaseModuleMock);
// and then drives mockAuth. Nothing here touches the network.
interface MockAuth {
  getSession: Mock;
  onAuthStateChange: Mock;
  signInWithPassword: Mock;
  signUp: Mock;
  signInWithOAuth: Mock;
  resetPasswordForEmail: Mock;
  updateUser: Mock;
  signOut: Mock;
}

export const mockAuth: MockAuth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};

export const supabaseModuleMock: {
  isSupabaseConfigured: boolean;
  requireSupabase: () => { auth: MockAuth };
} = {
  isSupabaseConfigured: true,
  requireSupabase: () => ({ auth: mockAuth }),
};
