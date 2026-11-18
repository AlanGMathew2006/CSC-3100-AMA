import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

// Password recovery used to live inside AuthProvider; these are the same
// behaviors, now tested through the hook. The Supabase client module is mocked.
vi.mock("./lib/supabase", async () => (await import("./test/mockSupabase")).supabaseModuleMock);

import { mockAuth } from "./test/mockSupabase";
import { AuthProvider, useAuth } from "./auth";
import { PasswordRecoveryProvider, usePasswordRecovery } from "./passwordRecovery";

type AuthListener = (event: string, session: Session | null) => void;

const unsubscribe = vi.fn();
// Every onAuthStateChange subscriber, like the real client keeps.
let listeners: AuthListener[] = [];
const emitAuthEvent: AuthListener = (event, session) =>
  listeners.forEach((listener) => listener(event, session));

const fakeSession = {
  access_token: "token",
  refresh_token: "refresh",
  token_type: "bearer",
  expires_in: 3600,
  user: { id: "user-1", email: "student@example.com" },
} as unknown as Session;

function wrapper({ children }: { children: ReactNode }) {
  return <PasswordRecoveryProvider>{children}</PasswordRecoveryProvider>;
}

function bothWrapper({ children }: { children: ReactNode }) {
  return (
    <PasswordRecoveryProvider>
      <AuthProvider>{children}</AuthProvider>
    </PasswordRecoveryProvider>
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  listeners = [];
  mockAuth.getSession.mockResolvedValue({ data: { session: null } });
  mockAuth.onAuthStateChange.mockImplementation((listener: AuthListener) => {
    listeners.push(listener);
    return { data: { subscription: { unsubscribe } } };
  });
  mockAuth.updateUser.mockResolvedValue({ data: {}, error: null });
});

describe("usePasswordRecovery", () => {
  it("is not recovering on a normal visit", () => {
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper });
    expect(result.current.recovering).toBe(false);
  });

  it("is recovering when opened on /reset-password", () => {
    window.history.replaceState(null, "", "/reset-password");
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper });
    expect(result.current.recovering).toBe(true);
  });

  it("is recovering when the URL hash says type=recovery", () => {
    window.history.replaceState(null, "", "/#access_token=abc&type=recovery");
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper });
    expect(result.current.recovering).toBe(true);
  });

  it("starts recovering on a PASSWORD_RECOVERY auth event, and ignores other events", () => {
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper });
    act(() => emitAuthEvent("SIGNED_IN", fakeSession));
    expect(result.current.recovering).toBe(false);
    act(() => emitAuthEvent("PASSWORD_RECOVERY", fakeSession));
    expect(result.current.recovering).toBe(true);
  });

  it("unsubscribes from auth changes when it unmounts", () => {
    const { unmount } = renderHook(() => usePasswordRecovery(), { wrapper });
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("updatePassword saves the password, leaves recovery and clears the reset URL", async () => {
    window.history.replaceState(null, "", "/reset-password");
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper });
    await act(() => result.current.updatePassword("a-brand-new-password"));
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: "a-brand-new-password" });
    expect(result.current.recovering).toBe(false);
    expect(window.location.pathname).toBe("/");
  });

  it("updatePassword throws the Supabase error and stays in recovery", async () => {
    window.history.replaceState(null, "", "/reset-password");
    const error = new Error("Password too weak");
    mockAuth.updateUser.mockResolvedValue({ data: {}, error });
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper });
    await expect(result.current.updatePassword("short")).rejects.toBe(error);
    expect(result.current.recovering).toBe(true);
    expect(window.location.pathname).toBe("/reset-password");
  });

  it("cancelPasswordRecovery leaves recovery and clears the reset URL", () => {
    window.history.replaceState(null, "", "/reset-password");
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper });
    act(() => result.current.cancelPasswordRecovery());
    expect(result.current.recovering).toBe(false);
    expect(window.location.pathname).toBe("/");
  });

  it("leaves other URLs alone when recovery ends", () => {
    window.history.replaceState(null, "", "/#access_token=abc&type=recovery");
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper });
    act(() => result.current.cancelPasswordRecovery());
    expect(result.current.recovering).toBe(false);
    expect(window.location.hash).toBe("#access_token=abc&type=recovery");
  });

  it("throws when used outside PasswordRecoveryProvider", () => {
    // React and jsdom both log a render error; keep the test output clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const hush = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", hush);
    expect(() => renderHook(() => usePasswordRecovery())).toThrow(
      "usePasswordRecovery must be used inside PasswordRecoveryProvider",
    );
    window.removeEventListener("error", hush);
    spy.mockRestore();
  });
});

describe("password recovery next to AuthProvider", () => {
  it("a PASSWORD_RECOVERY event gives the user a session and starts recovery", async () => {
    const { result } = renderHook(
      () => ({ auth: useAuth(), recovery: usePasswordRecovery() }),
      { wrapper: bothWrapper },
    );
    await act(async () => {});
    act(() => emitAuthEvent("PASSWORD_RECOVERY", fakeSession));
    expect(result.current.recovery.recovering).toBe(true);
    expect(result.current.auth.user?.email).toBe("student@example.com");
  });
});
