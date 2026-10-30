import assert from "node:assert/strict";
import { test } from "node:test";
import {
  diningClock,
  getOpenStatus,
  keepOpenOfferings,
  parseClockTime,
  type WeeklyHours,
} from "./hours.js";

// 2026-10-28 is a Wednesday; Los Angeles is on PDT (UTC-7) until 2026-11-01.
const la = (isoLocal: string) => new Date(`${isoLocal}-07:00`);

const weekday = (windows: WeeklyHours["mon"]): WeeklyHours => ({
  sun: [],
  mon: windows,
  tue: windows,
  wed: windows,
  thu: windows,
  fri: windows,
  sat: [],
});

test("diningClock converts to America/Los_Angeles, not the machine's zone", () => {
  // 03:30 UTC Thursday is 20:30 Wednesday in Los Angeles.
  assert.deepEqual(diningClock(new Date("2026-10-29T03:30:00Z")), {
    day: "wed",
    minute: 20 * 60 + 30,
  });
  assert.deepEqual(diningClock(la("2026-10-28T00:00")), { day: "wed", minute: 0 });
});

test("open inside a window and closed outside it", () => {
  const hours = weekday([{ open: "07:00", close: "20:00" }]);
  assert.equal(getOpenStatus(hours, la("2026-10-28T12:15")), "open");
  assert.equal(getOpenStatus(hours, la("2026-10-28T21:00")), "closed");
  assert.equal(getOpenStatus(hours, la("2026-10-28T06:30")), "closed");
});

test("a day with no windows is closed", () => {
  const hours = weekday([{ open: "07:00", close: "20:00" }]);
  // 2026-10-25 is a Sunday.
  assert.equal(getOpenStatus(hours, la("2026-10-25T12:00")), "closed");
});

test("opening minute counts as open, closing minute counts as closed", () => {
  const hours = weekday([{ open: "07:00", close: "20:00" }]);
  assert.equal(getOpenStatus(hours, la("2026-10-28T07:00")), "open");
  assert.equal(getOpenStatus(hours, la("2026-10-28T06:59")), "closed");
  assert.equal(getOpenStatus(hours, la("2026-10-28T19:59")), "open");
  assert.equal(getOpenStatus(hours, la("2026-10-28T20:00")), "closed");
});

test("multiple windows per day leave the gap closed", () => {
  const hours = weekday([
    { open: "07:00", close: "10:30" },
    { open: "11:00", close: "14:00" },
  ]);
  assert.equal(getOpenStatus(hours, la("2026-10-28T10:00")), "open");
  assert.equal(getOpenStatus(hours, la("2026-10-28T10:45")), "closed");
  assert.equal(getOpenStatus(hours, la("2026-10-28T11:00")), "open");
  assert.equal(getOpenStatus(hours, la("2026-10-28T14:00")), "closed");
});

test("a close after midnight carries into the next day", () => {
  // Open Friday 18:00 until 01:00 Saturday; Saturday itself has no windows.
  const hours: WeeklyHours = {
    ...weekday([]),
    fri: [{ open: "18:00", close: "01:00" }],
  };
  assert.equal(getOpenStatus(hours, la("2026-10-30T23:30")), "open"); // Fri
  assert.equal(getOpenStatus(hours, la("2026-10-31T00:30")), "open"); // Sat, after midnight
  assert.equal(getOpenStatus(hours, la("2026-10-31T01:00")), "closed"); // exact close minute
  assert.equal(getOpenStatus(hours, la("2026-10-30T17:59")), "closed");
  // Thursday has no late window, so early Friday is closed.
  assert.equal(getOpenStatus(hours, la("2026-10-30T00:30")), "closed");
});

test("Subway Kennedy Library: 07:00-02:00 every day closes at 02:00 the next morning", () => {
  const daily = [{ open: "07:00", close: "02:00" }];
  const hours: WeeklyHours = {
    sun: daily, mon: daily, tue: daily, wed: daily, thu: daily, fri: daily, sat: daily,
  };
  assert.equal(getOpenStatus(hours, la("2026-10-28T23:00")), "open"); // Wed night
  assert.equal(getOpenStatus(hours, la("2026-10-29T01:59")), "open"); // Thu, still Wed's window
  assert.equal(getOpenStatus(hours, la("2026-10-29T02:00")), "closed"); // exact close minute
  assert.equal(getOpenStatus(hours, la("2026-10-29T06:59")), "closed");
  assert.equal(getOpenStatus(hours, la("2026-10-29T07:00")), "open");
});

test("Subway PCV: Saturday 09:00-00:00 closes exactly at midnight", () => {
  const regular = [{ open: "09:00", close: "22:00" }];
  const hours: WeeklyHours = {
    sun: regular, mon: regular, tue: regular, wed: regular, thu: regular, fri: regular,
    sat: [{ open: "09:00", close: "00:00" }],
  };
  assert.equal(getOpenStatus(hours, la("2026-10-31T23:59")), "open"); // Sat
  assert.equal(getOpenStatus(hours, la("2026-11-01T00:00")), "closed"); // Sun midnight
  assert.equal(getOpenStatus(hours, la("2026-10-30T22:30")), "closed"); // Fri closes at 22:00
});

test("missing, empty, or malformed hours are unknown", () => {
  const at = la("2026-10-28T12:00");
  assert.equal(getOpenStatus(null, at), "unknown");
  assert.equal(getOpenStatus(undefined, at), "unknown");
  assert.equal(getOpenStatus({}, at), "unknown");
  assert.equal(
    getOpenStatus(weekday([{ open: "7am", close: "20:00" }]), at),
    "unknown",
  );
});

test("parseClockTime accepts HH:MM up to 24:00 only", () => {
  assert.equal(parseClockTime("00:00"), 0);
  assert.equal(parseClockTime("24:00"), 1440);
  assert.equal(parseClockTime("24:30"), null);
  assert.equal(parseClockTime("7:00"), null);
  assert.equal(parseClockTime(null), null);
});

test("keepOpenOfferings drops closed locations but keeps unknown and combo-only items", () => {
  const items = [
    { id: "a", offerings: [{ open_status: "open" as const }, { open_status: "closed" as const }] },
    { id: "b", offerings: [{ open_status: "closed" as const }] },
    { id: "c", offerings: [{ open_status: "unknown" as const }] },
    { id: "d", offerings: [] },
  ];
  assert.deepEqual(
    keepOpenOfferings(items).map((item) => [item.id, item.offerings.length]),
    [["a", 1], ["c", 1], ["d", 0]],
  );
});
