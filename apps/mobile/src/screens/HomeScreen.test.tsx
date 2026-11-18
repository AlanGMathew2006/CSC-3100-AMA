import type { Recommendation, RecommendationsResponse } from "@csc-3100-ama/shared";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { api } from "../lib/api";
import { HomeScreen } from "./HomeScreen";

const mockSignOut = jest.fn();
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { email: "student@example.com" }, signOut: mockSignOut }),
}));
jest.mock("../lib/api", () => ({
  api: { fetchProfile: jest.fn(), fetchRecommendations: jest.fn() },
}));

const mockedApi = jest.mocked(api);

const profile = {
  id: "u1",
  display_name: "Sam",
  dining_dollars_balance: 100,
  daily_spending_target: 25,
  onboarding_completed: true,
};

function rec(name: string, overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    location: { id: `loc-${name}`, name: "Panda Express", campus_area: null, open_status: "open" },
    combo: { id: "c1", name, price: 11.5 },
    items: [],
    total_price: 11.5,
    nutrition: { calories: 812.4, protein_g: 41.6 },
    targets: {},
    macro_match: {} as Recommendation["macro_match"],
    explanation: "",
    objective: 0,
    ...overrides,
  };
}

function response(recommendations: Recommendation[], reason: RecommendationsResponse["reason"] = null) {
  return { recommendations, reason, skipped: [] } as unknown as RecommendationsResponse;
}

beforeEach(() => {
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockedApi.fetchProfile.mockResolvedValue(profile);
  mockedApi.fetchRecommendations.mockResolvedValue(response([rec("Panda Bowl")]));
});

describe("HomeScreen", () => {
  it("shows the email, onboarding status and recommendations", async () => {
    await render(<HomeScreen />);
    expect(await screen.findByText("Signed in as student@example.com")).toBeTruthy();
    expect(screen.getByText("Onboarding: done")).toBeTruthy();
    expect(screen.getByText("Panda Bowl")).toBeTruthy();
    expect(screen.getByText("$11.50 · 812 cal · 42g protein")).toBeTruthy();
    expect(mockedApi.fetchRecommendations).toHaveBeenCalledWith(3);
  });

  it("says 'unavailable' for a missing price or nutrition value", async () => {
    mockedApi.fetchRecommendations.mockResolvedValue(
      response([rec("Mystery", { total_price: null as unknown as number, nutrition: { calories: null } })]),
    );
    await render(<HomeScreen />);
    expect(await screen.findByText("unavailable · unavailable · unavailable")).toBeTruthy();
  });

  it("shows only the first three recommendations", async () => {
    mockedApi.fetchRecommendations.mockResolvedValue(
      response([rec("One"), rec("Two"), rec("Three"), rec("Four")]),
    );
    await render(<HomeScreen />);
    expect(await screen.findByText("Three")).toBeTruthy();
    expect(screen.queryByText("Four")).toBeNull();
  });

  it("shows the empty state with the reason", async () => {
    mockedApi.fetchRecommendations.mockResolvedValue(response([], "over_daily_budget"));
    await render(<HomeScreen />);
    expect(await screen.findByText(/reached today's spending target/)).toBeTruthy();
  });

  it("says when onboarding isn't done", async () => {
    mockedApi.fetchProfile.mockResolvedValue({ ...profile, onboarding_completed: false });
    await render(<HomeScreen />);
    expect(await screen.findByText(/Onboarding: not done yet/)).toBeTruthy();
  });

  it("shows the error with a Retry that loads again", async () => {
    mockedApi.fetchProfile.mockRejectedValueOnce(new Error("Can't reach the PolyProvision server. Try again."));
    await render(<HomeScreen />);
    expect(await screen.findByText("Can't reach the PolyProvision server. Try again.")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Panda Bowl")).toBeTruthy();
  });

  it("signs out", async () => {
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Sign out" }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("shows a message if sign out fails", async () => {
    mockSignOut.mockRejectedValue(new Error("network"));
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Couldn't sign out. Try again.")).toBeTruthy();
  });
});
