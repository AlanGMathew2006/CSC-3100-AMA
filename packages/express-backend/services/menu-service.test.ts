import assert from "node:assert/strict";
import { test } from "node:test";
import { latestOfferings } from "./menu-service.js";

const loc = (id: string, name: string) => ({
  id,
  name,
  campus_area: null
});

test("latestOfferings keeps the newest available price per location", () => {
  const result = latestOfferings([
    {
      price: 5,
      service_date: "2026-10-01",
      available: true,
      location: loc("a", "Subway (A)")
    },
    {
      price: 6,
      service_date: "2026-10-05",
      available: true,
      location: loc("a", "Subway (A)")
    },
    {
      price: 9,
      service_date: "2026-10-09",
      available: false,
      location: loc("a", "Subway (A)")
    },
    {
      price: 7,
      service_date: "2026-10-05",
      available: true,
      location: loc("b", "Subway (B)")
    }
  ]);
  assert.deepEqual(
    result.map((o) => [o.location_name, o.price]),
    [
      ["Subway (A)", 6],
      ["Subway (B)", 7]
    ]
  );
});
