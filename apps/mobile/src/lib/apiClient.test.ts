import { createApiClient, type ApiDeps } from "./apiClient";

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(responses: (Response | Error)[], overrides: Partial<ApiDeps> = {}) {
  const queue = [...responses];
  const fetchImpl = jest.fn(async (_url: string, _init?: RequestInit) => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra fetch");
    if (next instanceof Error) throw next;
    return next;
  });
  const deps: ApiDeps = {
    baseUrl: "http://192.168.1.20:8000",
    getAccessToken: jest.fn(async () => "token-1"),
    refreshAccessToken: jest.fn(async () => "token-2"),
    signOutLocal: jest.fn(async () => {}),
    fetchImpl: fetchImpl as unknown as typeof fetch,
    ...overrides,
  };
  return { api: createApiClient(deps), deps, fetchImpl };
}

function authHeader(fetchImpl: jest.Mock, call: number): string {
  const init = fetchImpl.mock.calls[call][1] as RequestInit;
  return (init.headers as Record<string, string>).Authorization;
}

describe("api client", () => {
  it("sends the Bearer token to the right URL and returns the JSON body", async () => {
    const profile = { id: "u1", onboarding_completed: true };
    const { api, fetchImpl } = setup([jsonResponse(200, profile)]);

    await expect(api.fetchProfile()).resolves.toEqual(profile);
    expect(fetchImpl.mock.calls[0][0]).toBe("http://192.168.1.20:8000/api/profile");
    expect(authHeader(fetchImpl, 0)).toBe("Bearer token-1");
  });

  it("asks for a limited number of recommendations", async () => {
    const { api, fetchImpl } = setup([jsonResponse(200, { recommendations: [] })]);
    await api.fetchRecommendations({ limit: 3 });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://192.168.1.20:8000/api/recommendations?limit=3");
  });

  it("fails without calling the server when there is no session", async () => {
    const { api, fetchImpl } = setup([], { getAccessToken: jest.fn(async () => null) });
    await expect(api.fetchProfile()).rejects.toThrow("You are signed out. Please log in again.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refreshes the session once on a 401 and retries with the new token", async () => {
    const { api, deps, fetchImpl } = setup([jsonResponse(401), jsonResponse(200, { id: "u1" })]);

    await expect(api.fetchProfile()).resolves.toEqual({ id: "u1" });
    expect(deps.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authHeader(fetchImpl, 1)).toBe("Bearer token-2");
    expect(deps.signOutLocal).not.toHaveBeenCalled();
  });

  it("signs out on a second 401", async () => {
    const { api, deps, fetchImpl } = setup([jsonResponse(401), jsonResponse(401)]);

    await expect(api.fetchProfile()).rejects.toThrow("Your session expired. Please log in again.");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(deps.signOutLocal).toHaveBeenCalledTimes(1);
  });

  it("signs out when the session can't be refreshed", async () => {
    const { api, deps, fetchImpl } = setup([jsonResponse(401)], {
      refreshAccessToken: jest.fn(async () => null),
    });

    await expect(api.fetchProfile()).rejects.toThrow("Your session expired. Please log in again.");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(deps.signOutLocal).toHaveBeenCalledTimes(1);
  });

  it("shows the server's error message", async () => {
    const { api } = setup([jsonResponse(500, { error: "Database unavailable" })]);
    await expect(api.fetchProfile()).rejects.toThrow("Database unavailable");
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    const { api } = setup([new Response("oops", { status: 502 })]);
    await expect(api.fetchProfile()).rejects.toThrow("Request failed");
  });

  it("explains when the server can't be reached", async () => {
    const { api } = setup([new TypeError("Network request failed")]);
    await expect(api.fetchProfile()).rejects.toThrow("Can't reach the PolyProvision server. Try again.");
  });
});
