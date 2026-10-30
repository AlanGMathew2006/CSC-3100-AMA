import type { ItemAvailability, MenuItem, OpenStatus } from "@csc-3100-ama/shared";

export interface ListedLocation {
  label: string; // campus area, location name, or the restaurant as a last resort
  open_status: OpenStatus | null;
  availability: ItemAvailability | null;
}

// Where a meal card or detail page says the item is: its cheapest offering's location, or for an
// item with no price (unpriced or combo-only) its restaurant's best location from the menu API.
export function listedLocation(item: MenuItem): ListedLocation {
  const offering = item.offerings.reduce<MenuItem["offerings"][number] | null>(
    (cheapest, current) => (cheapest == null || current.price < cheapest.price ? current : cheapest),
    null,
  );
  if (offering) {
    return {
      label: offering.campus_area ?? offering.location_name,
      open_status: offering.open_status,
      availability: offering.availability,
    };
  }
  const fallback = item.restaurant_locations?.[0];
  return {
    label: fallback ? (fallback.campus_area ?? fallback.location_name) : item.restaurant,
    open_status: fallback?.open_status ?? null,
    availability: item.availability ?? fallback?.availability ?? null,
  };
}
