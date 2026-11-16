import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../lib/api";
import type { UserPreferences } from "../../types/dashboard";
import { PREFERENCES, PROFILE } from "../../test/fixtures";
import { ProfilePage } from "./ProfilePage";

vi.mock("../../lib/api");
vi.mock("../../auth", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

const mocked = vi.mocked(api);

beforeEach(() => {
  document.documentElement.dataset.theme = "dark";
});

describe("ProfilePage theme", () => {
  it("does not replace the current theme with its default while preferences load", async () => {
    let resolvePreferences: (preferences: UserPreferences) => void = () => {};
    mocked.fetchPreferences.mockReturnValue(
      new Promise((resolve) => {
        resolvePreferences = resolve;
      }),
    );

    render(
      <ProfilePage
        profile={PROFILE}
        onNavigate={vi.fn()}
        onProfileChanged={vi.fn()}
      />,
    );

    expect(document.documentElement.dataset.theme).toBe("dark");

    resolvePreferences({ ...PREFERENCES, theme: "dark" });
    expect(await screen.findByRole("button", { name: "Dark" })).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
