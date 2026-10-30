// Dining-hall hours (dining_locations.hours) and open/closed checks.
// Format: {"mon": [{"open": "07:00", "close": "20:00"}], ...}, times in America/Los_Angeles.
// A day with no windows ([]) is closed. A close at or before the open time runs past midnight,
// e.g. {"open": "18:00", "close": "01:00"} on fri is open until 1am Saturday.
// null, undefined, or {} means the hours are unknown.

export const DINING_TIME_ZONE = "America/Los_Angeles";

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export interface HoursWindow {
  open: string;
  close: string;
}

export type WeeklyHours = Partial<Record<DayKey, HoursWindow[]>>;

export type OpenStatus = "open" | "closed" | "unknown";

// When an item is served (meals.serving_windows / menu_combos.serving_windows), in the same format
// as location hours. null = whenever the location is open; "unknown" = not verified.
export type ServingWindows = WeeklyHours | "unknown" | null;

export type ItemAvailability = "available" | "not_now" | "unknown";

// "07:30" -> 450. Accepts 00:00 through 24:00; returns null for anything else.
export function parseClockTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^([01]\d|2[0-4]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes <= 24 * 60 ? minutes : null;
}

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DINING_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Day of week and minute of the day for `at`, in America/Los_Angeles.
export function diningClock(at: Date): { day: DayKey; minute: number } {
  const parts = Object.fromEntries(
    formatter.formatToParts(at).map((part) => [part.type, part.value]),
  );
  const day = String(parts.weekday).slice(0, 3).toLowerCase() as DayKey;
  return { day, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DINING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// The instant midnight began on `at`'s calendar day in America/Los_Angeles ("today" for meal logs).
export function startOfDiningDay(at: Date): Date {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(at).map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
  const wallClockAsUtc = Date.UTC(
    parts.year as number,
    (parts.month as number) - 1,
    parts.day as number,
    parts.hour as number,
    parts.minute as number,
    parts.second as number,
  );
  const offsetMs = wallClockAsUtc - Math.floor(at.getTime() / 1000) * 1000;
  return new Date(
    Date.UTC(parts.year as number, (parts.month as number) - 1, parts.day as number) - offsetMs,
  );
}

export function getOpenStatus(
  hours: WeeklyHours | null | undefined,
  at: Date,
): OpenStatus {
  if (!hours || typeof hours !== "object" || Object.keys(hours).length === 0) {
    return "unknown";
  }
  const { day, minute } = diningClock(at);
  const previousDay = DAY_KEYS[(DAY_KEYS.indexOf(day) + 6) % 7] as DayKey;

  // [open, close] in minutes; null if any window is malformed, so bad data reads as unknown.
  const windows = (key: DayKey): [number, number][] | null => {
    const list = hours[key] ?? [];
    if (!Array.isArray(list)) return null;
    const parsed: [number, number][] = [];
    for (const window of list) {
      const open = parseClockTime(window?.open);
      const close = parseClockTime(window?.close);
      if (open === null || close === null) return null;
      parsed.push([open, close]);
    }
    return parsed;
  };

  const today = windows(day);
  const yesterday = windows(previousDay);
  if (!today || !yesterday) return "unknown";

  // Open from the opening minute up to, but not including, the closing minute.
  const openToday = today.some(([open, close]) =>
    close > open ? minute >= open && minute < close : minute >= open,
  );
  const openFromYesterday = yesterday.some(
    ([open, close]) => close <= open && minute < close,
  );
  return openToday || openFromYesterday ? "open" : "closed";
}

// Whether the item's own serving window is open at `at`, ignoring location hours.
export function servingWindowStatus(windows: ServingWindows | undefined, at: Date): OpenStatus {
  if (windows == null) return "open";
  if (windows === "unknown") return "unknown";
  return getOpenStatus(windows, at);
}

// Available only when the location is open AND the item's serving window is open.
// A definite "no" from either side wins (not_now); otherwise anything unknown gives "unknown".
export function getItemAvailability(
  itemWindows: ServingWindows | undefined,
  locationHours: WeeklyHours | null | undefined,
  at: Date,
): ItemAvailability {
  const location = getOpenStatus(locationHours, at);
  const item = servingWindowStatus(itemWindows, at);
  if (location === "closed" || item === "closed") return "not_now";
  if (location === "unknown" || item === "unknown") return "unknown";
  return "available";
}

const AVAILABILITY_RANK: Record<ItemAvailability, number> = { available: 0, unknown: 1, not_now: 2 };

// Best of several locations' availability (available > unknown > not_now); null for none.
export function combineAvailability(statuses: ItemAvailability[]): ItemAvailability | null {
  return statuses.reduce<ItemAvailability | null>(
    (best, status) =>
      best === null || AVAILABILITY_RANK[status] < AVAILABILITY_RANK[best] ? status : best,
    null,
  );
}

export const compareAvailability = (a: ItemAvailability, b: ItemAvailability) =>
  AVAILABILITY_RANK[a] - AVAILABILITY_RANK[b];

// Drops offerings that aren't served right now (closed location or outside the item's serving
// window); "unknown" ones stay, marked by `availability`. Items left with no offerings are dropped.
// Items that never had an offering (unpriced, combo-only) use their item-level `availability`,
// which comes from their restaurant's locations.
export function keepOpenOfferings<
  T extends { offerings: { availability: ItemAvailability }[]; availability?: ItemAvailability },
>(items: T[]): T[] {
  return items.flatMap((item) => {
    if (item.offerings.length === 0) return item.availability === "not_now" ? [] : [item];
    const offerings = item.offerings.filter((o) => o.availability !== "not_now");
    return offerings.length ? [{ ...item, offerings }] : [];
  });
}
