import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../lib/api";
import { PREFERENCES, PROFILE } from "../../test/fixtures";
import { ProfilePage } from "./ProfilePage";

// The API layer is mocked; no network, no Supabase.
vi.mock("../../lib/api");
vi.mock("../../auth", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

const mocked = vi.mocked(api);

function renderProfile() {
  const onProfileChanged = vi.fn();
  render(<ProfilePage profile={PROFILE} onNavigate={vi.fn()} onProfileChanged={onProfileChanged} />);
  return { onProfileChanged };
}

beforeEach(() => {
  mocked.fetchPreferences.mockResolvedValue(PREFERENCES);
  mocked.updatePreferences.mockResolvedValue(PREFERENCES);
  mocked.updateProfile.mockResolvedValue(PROFILE);
});

describe("ProfilePage allergens and avoided foods", () => {
  it("shows every tracked allergen with a readable label, none selected by default", async () => {
    renderProfile();
    for (const label of ["Milk", "Egg", "Wheat", "Soy", "Peanut", "Tree nuts", "Fish", "Shellfish", "Sesame"]) {
      const chip = await screen.findByRole("button", { name: label });
      expect(chip.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("loads existing allergens and avoided foods", async () => {
    mocked.fetchPreferences.mockResolvedValue({
      ...PREFERENCES,
      allergens: ["peanut", "Dairy"],
      excluded_foods: ["mushroom"],
    });
    renderProfile();
    expect((await screen.findByRole("button", { name: "Peanut" })).getAttribute("aria-pressed")).toBe("true");
    // An older value like "Dairy" counts as milk.
    expect(screen.getByRole("button", { name: "Milk" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Egg" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Remove mushroom" })).toBeTruthy();
  });

  it("saves the selected allergens and avoided foods", async () => {
    const user = userEvent.setup();
    const { onProfileChanged } = renderProfile();

    await user.click(await screen.findByRole("button", { name: "Tree nuts" }));
    await user.click(screen.getByRole("button", { name: "Sesame" }));
    await user.click(screen.getByRole("button", { name: "Sesame" })); // off again
    await user.type(screen.getByLabelText("Food to avoid"), "  Mushroom ");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(await screen.findByText("Preferences saved.")).toBeTruthy();
    expect(mocked.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ allergens: ["tree_nut"], excluded_foods: ["Mushroom"] }),
    );
    expect(onProfileChanged).toHaveBeenCalled();
  });

  it("adds a food with Enter, ignores duplicates and removes foods", async () => {
    const user = userEvent.setup();
    renderProfile();
    const input = await screen.findByLabelText("Food to avoid");

    await user.type(input, "olives{Enter}");
    await user.type(input, "Olives{Enter}");
    expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Remove olives" }));
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
    expect(mocked.updatePreferences).not.toHaveBeenCalled();
  });

  it("explains that meals without verified allergen info are hidden", async () => {
    const user = userEvent.setup();
    renderProfile();
    expect(screen.queryByText(/without verified allergen information/)).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Milk" }));
    expect(screen.getByText(/without verified allergen information/)).toBeTruthy();
  });

  it("shows an error and doesn't claim success when saving fails", async () => {
    const user = userEvent.setup();
    mocked.updatePreferences.mockRejectedValue(new Error("Can't reach the PolyProvision server. Try again."));
    const { onProfileChanged } = renderProfile();

    await user.click(await screen.findByRole("button", { name: "Soy" }));
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Can't reach the PolyProvision server");
    expect(screen.queryByText("Preferences saved.")).toBeNull();
    expect(onProfileChanged).not.toHaveBeenCalled();
  });
});
