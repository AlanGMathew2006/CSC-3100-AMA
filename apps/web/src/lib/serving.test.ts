import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clockLabel, servingLabel, servingStatusText, servingWindowSummary } from "./serving";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const every = (open: string, close: string) =>
  Object.fromEntries(DAYS.map((d) => [d, [{ open, close }]]));

describe("clockLabel", () => {
  it("formats 24-hour times", () => {
    assert.equal(clockLabel("10:30"), "10:30 am");
    assert.equal(clockLabel("11:00"), "11 am");
    assert.equal(clockLabel("00:00"), "12 am");
    assert.equal(clockLabel("12:00"), "12 pm");
    assert.equal(clockLabel("21:05"), "9:05 pm");
  });
});

describe("servingLabel", () => {
  it("labels Chick-fil-A breakfast", () => {
    assert.equal(
      servingLabel({ category: "Breakfast", serving_windows: every("00:00", "10:30") }),
      "Breakfast · until 10:30 am",
    );
  });
  it("uses the combo description and handles other windows", () => {
    assert.equal(
      servingLabel({ description: "Breakfast meal: entree + side + drink", serving_windows: every("07:00", "10:30") }),
      "Breakfast · 7 am–10:30 am",
    );
    assert.equal(servingLabel({ category: "Sides", serving_windows: { ...every("11:00", "14:00"), sun: [] } }), "Limited hours · 11 am–2 pm");
  });
  it("shows just the name when the serving time is unknown, nothing when all day", () => {
    assert.equal(servingLabel({ category: "Breakfast", serving_windows: "unknown" }), "Breakfast");
    assert.equal(servingLabel({ category: "Sides", serving_windows: null }), null);
  });
  it("summarizes uneven windows as limited hours", () => {
    assert.equal(servingWindowSummary({ ...every("00:00", "10:30"), sat: [{ open: "00:00", close: "11:00" }] }), "limited hours");
  });
});

describe("servingStatusText", () => {
  it("explains when an item isn't served now or its time is unknown", () => {
    assert.equal(servingStatusText(every("00:00", "10:30"), "not_now"), "Not served right now");
    assert.equal(servingStatusText(every("00:00", "10:30"), "available"), null);
    assert.equal(servingStatusText("unknown", "unknown"), "Serving time unknown");
    assert.equal(servingStatusText(null, "not_now"), null);
  });
});
