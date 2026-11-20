import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createApp } from "../backend.js";

async function withServer(
  db: SupabaseClient,
  run: (baseUrl: string) => Promise<void>,
) {
  const app = createApp({
    authenticateToken: async (token) =>
      token === "valid-test-token" ? { db, userId: "test-user" } : null,
  });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("system: menu request combines API routing, menu service, and data access", async () => {
  const openLocation = {
    id: "open-location",
    name: "Open Cafe",
    campus_area: "Central",
    hours: {},
  };
  const db = {
    from(table: string) {
      const data =
        table === "meals"
          ? [
              {
                id: "pasta",
                name: "Pasta",
                restaurant: "Open Cafe",
                category: "Entrees",
                serving_windows: null,
                offerings: [
                  {
                    price: 8,
                    service_date: "2026-11-20",
                    available: true,
                    location: openLocation,
                  },
                ],
              },
            ]
          : table === "menu_combos"
            ? []
            : table === "dining_locations"
              ? [openLocation]
              : [];
      const chain = {
        select: () => chain,
        not: () => chain,
        order: () => chain,
        then: (resolve: (value: unknown) => unknown) =>
          resolve({ data, error: null }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;

  await withServer(db, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/menu`, {
      headers: { Authorization: "Bearer valid-test-token" },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.items[0]?.id, "pasta");
    assert.equal(body.items[0]?.offerings[0]?.price, 8);
  });
});

test("system: meal-log request validates, creates through the service, and persists", async () => {
  let inserted: Record<string, unknown> | undefined;
  const db = {
    from(table: string) {
      assert.equal(table, "meal_logs");
      const chain: Record<string, unknown> = {};
      chain.insert = (row: Record<string, unknown>) => {
        inserted = row;
        return chain;
      };
      chain.select = () => chain;
      chain.single = () =>
        Promise.resolve({
          data: { id: "log-1", ...inserted },
          error: null,
        });
      return chain;
    },
  } as unknown as SupabaseClient;

  await withServer(db, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/meal-logs`, {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test pasta",
        price: 8.25,
        calories: 620,
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.id, "log-1");
    assert.equal(body.name, "Test pasta");
    assert.equal(inserted?.user_id, "test-user");
  });
});
