import type { MenuItem } from "./index.js";
import type { OpenStatus } from "./hours.js";

export const cheapestOffering = (item: MenuItem) =>
  item.offerings.reduce<(typeof item.offerings)[number] | null>(
    (cheapest, offering) =>
      cheapest == null || offering.price < cheapest.price ? offering : cheapest,
    null,
  );

export const mealPrice = (item: MenuItem): number | null =>
  cheapestOffering(item)?.price ?? null;

export const OPEN_LABELS: Record<OpenStatus, string> = {
  open: "Open",
  closed: "Closed",
  unknown: "Hours unavailable",
};
