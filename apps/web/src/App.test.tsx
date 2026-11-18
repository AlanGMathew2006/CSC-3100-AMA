import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROFILE } from "./test/fixtures";

// Routing tests: App is rendered with mocked auth state (and a mocked profile
// hook), and each state must show the right screen. The auth pages are the real
// ones; the signed-in pages are stubs because they have their own tests.
const state = vi.hoisted(() => ({
  configured: true,
  auth: {} as Record<string, unknown>,
  recovery: {} as Record<string, unknown>,
  profile: {} as Record<string, unknown>,
}));

vi.mock("./lib/supabase", () => ({
  get isSupabaseConfigured() {
    return state.configured;
  },
  requireSupabase: () => {
    throw new Error("the network must not be used in App routing tests");
  },
}));
vi.mock("./auth", () => ({ useAuth: () => state.auth }));
vi.mock("./passwordRecovery", () => ({ usePasswordRecovery: () => state.recovery }));
vi.mock("./hooks/useProfile", () => ({ useProfile: () => state.profile }));
vi.mock("./pages/app/DashboardPage", () => ({
  DashboardPage: () => <h1>Dashboard stub</h1>,
}));
vi.mock("./pages/app/OnboardingPage", () => ({
  OnboardingPage: () => <h1>Onboarding stub</h1>,
}));

import App from "./App";

const clearEmailConfirmation = vi.fn();
const cancelPasswordRecovery = vi.fn();
const reload = vi.fn();

function setAuth(overrides: Record<string, unknown> = {}) {
  state.auth = {
    session: null,
    user: null,
    loading: false,
    emailConfirmationPending: false,
    clearEmailConfirmation,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  };
}

function setRecovery(overrides: Record<string, unknown> = {}) {
  state.recovery = {
    recovering: false,
    cancelPasswordRecovery,
    updatePassword: vi.fn(),
    ...overrides,
  };
}

const signedIn = { session: { user: { id: "user-1" } }, user: { id: "user-1" } };

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

beforeEach(() => {
  state.configured = true;
  setAuth();
  setRecovery();
  state.profile = { profile: PROFILE, loading: false, error: "", reload };
  window.history.replaceState(null, "", "/");
});

describe("App when Supabase is not configured", () => {
  it("explains how to configure it and shows nothing else", () => {
    state.configured = false;
    setAuth(signedIn);
    render(<App />);
    expect(screen.getByRole("alert").textContent).toContain("Supabase isn't configured");
    expect(screen.queryByText("Dashboard stub")).toBeNull();
  });
});

describe("App while loading", () => {
  it("shows only the branded shell", () => {
    setAuth({ loading: true });
    const { container } = render(<App />);
    expect(container.querySelector(".page-shell > .brand-header")).not.toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("App with an email confirmation link", () => {
  it("shows the confirmation screen, even while the session is still loading", () => {
    setAuth({ emailConfirmationPending: true, loading: true });
    render(<App />);
    expect(screen.getByRole("heading", { name: "Email confirmed" })).toBeTruthy();
  });

  it("Go to log in clears the link and opens the log in screen", () => {
    window.history.replaceState(null, "", "/?confirmed=1");
    setAuth({ emailConfirmationPending: true });
    const { rerender } = render(<App />);
    click("Go to log in");
    expect(clearEmailConfirmation).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");

    // AuthProvider flips the flag after clearEmailConfirmation.
    setAuth();
    rerender(<App />);
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
  });
});

describe("App while recovering a password", () => {
  it("shows the new-password form when the reset link made a session", () => {
    setAuth(signedIn);
    setRecovery({ recovering: true });
    render(<App />);
    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeTruthy();
    expect(screen.queryByText("Dashboard stub")).toBeNull();
  });

  it("shows the expired-link message when there is no session", () => {
    setRecovery({ recovering: true });
    render(<App />);
    expect(screen.getByRole("heading", { name: "Reset link expired" })).toBeTruthy();
  });

  it("Back to log in cancels recovery and opens the log in screen", () => {
    setRecovery({ recovering: true });
    const { rerender } = render(<App />);
    click("Back to log in");
    expect(cancelPasswordRecovery).toHaveBeenCalledTimes(1);

    setRecovery({ recovering: false });
    rerender(<App />);
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
  });

  it("is shown instead of the loading shell's content once loading ends", () => {
    setAuth({ ...signedIn, loading: true });
    setRecovery({ recovering: true });
    const { rerender } = render(<App />);
    expect(screen.queryByRole("heading")).toBeNull();
    setAuth(signedIn);
    rerender(<App />);
    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeTruthy();
  });
});

describe("App when signed in", () => {
  beforeEach(() => setAuth(signedIn));

  it("shows the dashboard once onboarding is done", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Dashboard stub" })).toBeTruthy();
  });

  it("shows onboarding when it isn't done", () => {
    state.profile = { profile: { ...PROFILE, onboarding_completed: false }, loading: false, error: "", reload };
    render(<App />);
    expect(screen.getByRole("heading", { name: "Onboarding stub" })).toBeTruthy();
  });

  it("shows onboarding when there is no profile yet", () => {
    state.profile = { profile: null, loading: false, error: "", reload };
    render(<App />);
    expect(screen.getByRole("heading", { name: "Onboarding stub" })).toBeTruthy();
  });

  it("shows the branded shell while the profile loads", () => {
    state.profile = { profile: null, loading: true, error: "", reload };
    const { container } = render(<App />);
    expect(container.querySelector(".page-shell > .brand-header")).not.toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("shows the profile error with a Retry button", () => {
    state.profile = { profile: null, loading: false, error: "Can't reach the server", reload };
    render(<App />);
    expect(screen.getByRole("alert").textContent).toContain("Can't reach the server");
    click("Retry");
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("App when signed out", () => {
  it("starts on the welcome screen", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Eat smarter with your Dining Dollars." })).toBeTruthy();
  });

  it("Get started opens sign up", () => {
    render(<App />);
    click("Get started");
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeTruthy();
  });

  it("Sign in opens log in", () => {
    render(<App />);
    click("Sign in");
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
  });

  it("switches between log in and sign up", () => {
    render(<App />);
    click("Sign in");
    click("Create an account");
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeTruthy();
    click("Log in");
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
  });

  it("returns to the screen the user was on after signing out", () => {
    const { rerender } = render(<App />);
    click("Sign in");

    setAuth(signedIn);
    rerender(<App />);
    expect(screen.getByRole("heading", { name: "Dashboard stub" })).toBeTruthy();

    setAuth();
    rerender(<App />);
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
  });
});
