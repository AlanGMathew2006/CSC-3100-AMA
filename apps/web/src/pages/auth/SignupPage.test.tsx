import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../lib/supabase",
  async () =>
    (await import("../../test/mockSupabase")).supabaseModuleMock
);

import { AuthProvider } from "../../auth";
import { mockAuth } from "../../test/mockSupabase";
import { SignupPage } from "./SignupPage";

function renderSignupPage() {
  return render(
    <AuthProvider>
      <SignupPage onLogin={vi.fn()} />
    </AuthProvider>
  );
}

beforeEach(() => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null }
  });
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } }
  });
  mockAuth.signUp.mockClear();
  mockAuth.signUp.mockResolvedValue({
    data: { session: null },
    error: null
  });
});

describe("sign-up user journey", () => {
  it("shows a validation message when the email domain is malformed", async () => {
    const user = userEvent.setup();
    renderSignupPage();

    await user.type(screen.getByLabelText("Name"), "Sam");
    await user.type(
      screen.getByLabelText("Email"),
      "student@calpoly..edu"
    );
    await user.type(
      screen.getByLabelText("Password"),
      "correct horse"
    );
    await user.type(
      screen.getByLabelText("Confirm password"),
      "correct horse"
    );
    await user.click(
      screen.getByRole("button", { name: "Create account" })
    );

    expect(
      (await screen.findByRole("alert")).textContent
    ).toContain("Enter a valid email address.");
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it("confirms where to check email after valid sign-up", async () => {
    const user = userEvent.setup();
    renderSignupPage();

    await user.type(screen.getByLabelText("Name"), "Sam");
    await user.type(
      screen.getByLabelText("Email"),
      "Sam@Example.com"
    );
    await user.type(
      screen.getByLabelText("Password"),
      "correct horse"
    );
    await user.type(
      screen.getByLabelText("Confirm password"),
      "correct horse"
    );
    await user.click(
      screen.getByRole("button", { name: "Create account" })
    );

    expect(
      await screen.findByRole("heading", {
        name: "Check your email to confirm your account"
      })
    ).toBeTruthy();
    expect(screen.getByText(/sam@example\.com/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Go to log in" })
    ).toBeTruthy();
  });
});
