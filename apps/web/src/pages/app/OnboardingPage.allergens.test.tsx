import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../lib/api";
import { OnboardingPage } from "./OnboardingPage";

// The API layer is mocked; no network, no Supabase.
vi.mock("../../lib/api");

const mocked = vi.mocked(api);

async function fillPlan(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Dining Dollar Balance/), "400");
  await user.type(screen.getByLabelText(/Daily Spending Target/), "25");
}

beforeEach(() => {
  mocked.fetchLocations.mockResolvedValue([]);
  mocked.completeOnboarding.mockResolvedValue(undefined);
  mocked.updatePreferences.mockResolvedValue({} as never);
});

describe("OnboardingPage allergens and avoided foods", () => {
  it("saves allergens and avoided foods after the plan, then finishes", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    await fillPlan(user);
    await user.click(screen.getByRole("button", { name: "Peanut" }));
    await user.click(screen.getByRole("button", { name: "Shellfish" }));
    await user.type(screen.getByLabelText("Food to avoid"), "mushroom{Enter}");
    await user.click(screen.getByRole("button", { name: "See my recommendations" }));

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mocked.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(mocked.updatePreferences).toHaveBeenCalledWith({
      allergens: ["peanut", "shellfish"],
      excluded_foods: ["mushroom"],
    });
  });

  it("doesn't call the preferences endpoint when nothing is selected", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    await fillPlan(user);
    await user.click(screen.getByRole("button", { name: "See my recommendations" }));

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mocked.updatePreferences).not.toHaveBeenCalled();
  });

  it("stays on the page with an error if the allergens can't be saved", async () => {
    const user = userEvent.setup();
    mocked.updatePreferences.mockRejectedValue(new Error("boom"));
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    await fillPlan(user);
    await user.click(screen.getByRole("button", { name: "Milk" }));
    await user.click(screen.getByRole("button", { name: "See my recommendations" }));

    expect((await screen.findByRole("alert")).textContent).toContain("couldn't save your allergens");
    expect(onComplete).not.toHaveBeenCalled();
  });
});
