import { DAY_KEYS, type ItemAvailability, type ServingWindows } from "@csc-3100-ama/shared";

// "10:30" -> "10:30 am", "11:00" -> "11 am", "00:00" -> "12 am".
export function clockLabel(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h % 24 < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""} ${suffix}`;
}

// "until 10:30 am" when every serving day has the same single window starting at midnight,
// "7 am–10:30 am" for the same window starting later, otherwise "limited hours".
export function servingWindowSummary(windows: ServingWindows | undefined): string | null {
  if (windows == null || windows === "unknown") return null;
  const served = DAY_KEYS.map((day) => windows[day] ?? []).filter((list) => list.length > 0);
  const first = served[0]?.[0];
  const same =
    first &&
    served.every(
      (list) => list.length === 1 && list[0]?.open === first.open && list[0]?.close === first.close,
    );
  if (!first || !same) return "limited hours";
  return first.open === "00:00"
    ? `until ${clockLabel(first.close)}`
    : `${clockLabel(first.open)}–${clockLabel(first.close)}`;
}

// "Breakfast · until 10:30 am"; null for items served whenever the location is open.
export function servingLabel(item: {
  serving_windows?: ServingWindows;
  category?: string | null;
  description?: string | null;
}): string | null {
  if (item.serving_windows == null) return null;
  const breakfast = /breakfast/i.test(`${item.category ?? ""} ${item.description ?? ""}`);
  const name = breakfast ? "Breakfast" : "Limited hours";
  const summary = servingWindowSummary(item.serving_windows);
  return summary ? `${name} · ${summary}` : name;
}

// Shown under the label when the item isn't being served now, or its serving time is unknown.
export function servingStatusText(
  windows: ServingWindows | undefined,
  availability: ItemAvailability | undefined,
): string | null {
  if (windows == null || !availability) return null;
  if (availability === "not_now") return "Not served right now";
  if (windows === "unknown") return "Serving time unknown";
  return null;
}
