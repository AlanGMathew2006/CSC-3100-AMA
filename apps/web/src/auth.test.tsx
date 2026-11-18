import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

// Characterization tests: they describe how AuthProvider behaves today so the
// refactor can be checked against them. The Supabase client module is mocked,
// nothing touches the network.
const mockAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./lib/supabase", () => ({
  isSupabaseConfigured: true,
  requireSupabase: () => ({ auth: mockAuth }),
}));

import { AuthProvider, useAuth } from "./auth";

type AuthListener = (event: string, session: Session | null) => void;

const unsubscribe = vi.fn();
let emitAuthEvent: AuthListener = () => {};

function fakeSession(email = "student@example.com"): Session {
  return {
    access_token: "token",
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    user: { id: "user-1", email },
  } as unknown as Session;
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function renderAuth() {
  const view = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  mockAuth.getSession.mockResolvedValue({ data: { session: null } });
  mockAuth.onAuthStateChange.mockImplementation((listener: AuthListener) => {
    emitAuthEvent = listener;
    return { data: { subscription: { unsubscribe } } };
  });
  mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
  mockAuth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
  mockAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  mockAuth.updateUser.mockResolvedValue({ data: {}, error: null });
  mockAuth.signOut.mockResolvedValue({ error: null });
});

describe("AuthProvider session state", () => {
  it("starts loading, then reports no user when there is no stored session", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("loads a stored session on start", async () => {
    const session = fakeSession();
    mockAuth.getSession.mockResolvedValue({ data: { session } });
    const { result } = await renderAuth();
    expect(result.current.session).toBe(session);
    expect(result.current.user?.email).toBe("student@example.com");
  });

  it("follows onAuthStateChange for sign in and sign out", async () => {
    const { result } = await renderAuth();
    const session = fakeSession("other@example.com");

    act(() => emitAuthEvent("SIGNED_IN", session));
    expect(result.current.user?.email).toBe("other@example.com");

    act(() => emitAuthEvent("SIGNED_OUT", null));
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("unsubscribes from auth changes when it unmounts", async () => {
    const { unmount } = await renderAuth();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("AuthProvider email confirmation link", () => {
  it("is not pending on a normal visit", async () => {
    const { result } = await renderAuth();
    expect(result.current.emailConfirmationPending).toBe(false);
  });

  it("is pending when the URL has ?confirmed=1, and drops the session the link created", async () => {
    window.history.replaceState(null, "", "/?confirmed=1");
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession() } });
    const { result } = await renderAuth();

    expect(result.current.emailConfirmationPending).toBe(true);
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(result.current.session).toBeNull();

    // Auth events are ignored while the confirmation screen is showing.
    act(() => emitAuthEvent("SIGNED_IN", fakeSession()));
    expect(result.current.session).toBeNull();
  });

  it("clearEmailConfirmation ends the pending state", async () => {
    window.history.replaceState(null, "", "/?confirmed=1");
    const { result } = await renderAuth();
    act(() => result.current.clearEmailConfirmation());
    expect(result.current.emailConfirmationPending).toBe(false);
  });
});

describe("AuthProvider signIn", () => {
  it("signs in with a trimmed, lower-case email", async () => {
    const { result } = await renderAuth();
    await act(() => result.current.signIn("  Student@Example.COM ", "pw-123456789012"));
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "pw-123456789012",
    });
  });

  it("throws the Supabase error", async () => {
    const error = new Error("Invalid login credentials");
    mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error });
    const { result } = await renderAuth();
    await expect(result.current.signIn("a@b.co", "wrong")).rejects.toBe(error);
  });
});

describe("AuthProvider signUp", () => {
  it("resolves true when Supabase starts a session", async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: fakeSession() }, error: null });
    const { result } = await renderAuth();
    let started: boolean | undefined;
    await act(async () => {
      started = await result.current.signUp(" Sam ", "Sam@Example.com", "long-enough-password");
    });
    expect(started).toBe(true);
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: "sam@example.com",
      password: "long-enough-password",
      options: {
        data: { display_name: "Sam" },
        emailRedirectTo: `${window.location.origin}/?confirmed=1`,
      },
    });
  });

  it("resolves false when email confirmation is required", async () => {
    const { result } = await renderAuth();
    let started: boolean | undefined;
    await act(async () => {
      started = await result.current.signUp("Sam", "sam@example.com", "long-enough-password");
    });
    expect(started).toBe(false);
  });

  it("throws the Supabase error", async () => {
    const error = new Error("User already registered");
    mockAuth.signUp.mockResolvedValue({ data: { session: null }, error });
    const { result } = await renderAuth();
    await expect(result.current.signUp("Sam", "sam@example.com", "long-enough-password")).rejects.toBe(error);
  });
});

describe("AuthProvider Google sign in", () => {
  it("starts the OAuth flow and returns to the app origin", async () => {
    const { result } = await renderAuth();
    await act(() => result.current.signInWithGoogle());
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  });

  it("throws the Supabase error", async () => {
    const error = new Error("OAuth failed");
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error });
    const { result } = await renderAuth();
    await expect(result.current.signInWithGoogle()).rejects.toBe(error);
  });
});

describe("AuthProvider resetPassword", () => {
  it("sends the reset email with the reset-password redirect", async () => {
    const { result } = await renderAuth();
    await act(() => result.current.resetPassword(" Student@Example.com "));
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith("student@example.com", {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });

  it("throws the Supabase error", async () => {
    const error = new Error("rate limited");
    mockAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error });
    const { result } = await renderAuth();
    await expect(result.current.resetPassword("a@b.co")).rejects.toBe(error);
  });
});

describe("AuthProvider password recovery", () => {
  it("is not recovering on a normal visit", async () => {
    const { result } = await renderAuth();
    expect(result.current.recovering).toBe(false);
  });

  it("is recovering when opened on /reset-password", async () => {
    window.history.replaceState(null, "", "/reset-password");
    const { result } = await renderAuth();
    expect(result.current.recovering).toBe(true);
  });

  it("is recovering when the URL hash says type=recovery", async () => {
    window.history.replaceState(null, "", "/#access_token=abc&type=recovery");
    const { result } = await renderAuth();
    expect(result.current.recovering).toBe(true);
  });

  it("starts recovering on a PASSWORD_RECOVERY auth event", async () => {
    const { result } = await renderAuth();
    act(() => emitAuthEvent("PASSWORD_RECOVERY", fakeSession()));
    expect(result.current.recovering).toBe(true);
    expect(result.current.session).not.toBeNull();
  });

  it("updatePassword saves the password, leaves recovery and clears the reset URL", async () => {
    window.history.replaceState(null, "", "/reset-password");
    const { result } = await renderAuth();
    await act(() => result.current.updatePassword("a-brand-new-password"));
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: "a-brand-new-password" });
    expect(result.current.recovering).toBe(false);
    expect(window.location.pathname).toBe("/");
  });

  it("updatePassword throws the Supabase error and stays in recovery", async () => {
    window.history.replaceState(null, "", "/reset-password");
    const error = new Error("Password too weak");
    mockAuth.updateUser.mockResolvedValue({ data: {}, error });
    const { result } = await renderAuth();
    await expect(result.current.updatePassword("short")).rejects.toBe(error);
    expect(result.current.recovering).toBe(true);
    expect(window.location.pathname).toBe("/reset-password");
  });

  it("cancelPasswordRecovery leaves recovery and clears the reset URL", async () => {
    window.history.replaceState(null, "", "/reset-password");
    const { result } = await renderAuth();
    act(() => result.current.cancelPasswordRecovery());
    expect(result.current.recovering).toBe(false);
    expect(window.location.pathname).toBe("/");
  });
});

describe("AuthProvider signOut", () => {
  it("signs out through Supabase", async () => {
    const { result } = await renderAuth();
    await act(() => result.current.signOut());
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
  });

  it("throws the Supabase error", async () => {
    const error = new Error("network");
    mockAuth.signOut.mockResolvedValue({ error });
    const { result } = await renderAuth();
    await expect(result.current.signOut()).rejects.toBe(error);
  });
});

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    // React and jsdom both log a render error; keep the test output clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const hush = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", hush);
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used inside AuthProvider");
    window.removeEventListener("error", hush);
    spy.mockRestore();
  });
});
