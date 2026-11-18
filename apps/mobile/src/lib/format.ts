// Same rule as the web app: unknown values say "unavailable", never 0 or a dash.
export const UNAVAILABLE = "unavailable";

export function formatAmount(value: number | null | undefined, unit = ""): string {
  return value == null ? UNAVAILABLE : `${Math.round(Number(value))}${unit}`;
}

export function formatPrice(price: number | null | undefined): string {
  return price == null || !Number.isFinite(price) ? UNAVAILABLE : `$${price.toFixed(2)}`;
}
