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

// Drops offerings at closed locations; offerings with unknown hours stay (marked by open_status).
// Items left with no offerings are dropped, but items that never had one (combo-only) are kept.
export function keepOpenOfferings<
  T extends { offerings: { open_status: OpenStatus }[] },
>(items: T[]): T[] {
  return items.flatMap((item) => {
    if (item.offerings.length === 0) return [item];
    const offerings = item.offerings.filter((o) => o.open_status !== "closed");
    return offerings.length ? [{ ...item, offerings }] : [];
  });
}
