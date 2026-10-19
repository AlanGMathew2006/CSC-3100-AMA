// Menu import pipeline (pipe and filter, see TE4).
// Each stage is a pure function so it can be tested without Supabase:
//   CSV text -> parseCsv -> toItemRecords / toComboRecords (clean + validate) -> buildImportPlan (transform)
// The load stage (writing to Supabase) lives in ../import-menu.ts.

export type CsvRow = Record<string, string>;

// ---------- Stage 1: parse ----------

// Minimal RFC 4180 CSV parser: quoted fields, escaped quotes (""), commas and newlines inside quotes.
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) =>
    r.some((cell) => cell.trim() !== "")
  );
  const [header, ...body] = nonEmpty;
  if (!header) return [];
  const keys = header.map((h) =>
    h.replace(/^\uFEFF/, "").trim()
  );
  return body.map((cells) =>
    Object.fromEntries(
      keys.map((key, i) => [key, (cells[i] ?? "").trim()])
    )
  );
}

// ---------- Stage 2: clean + validate ----------

export interface ItemRecord {
  sourceId: string;
  restaurant: string;
  campusAreas: string[];
  category: string;
  name: string;
  serving: string | null;
  price: number | null;
  priceSource: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  mealComponent: "base" | "entree" | null;
  nutritionSource: string | null;
  collectedOn: string;
  notes: string | null;
}

export interface ComboRecord {
  sourceId: string;
  restaurant: string;
  name: string;
  description: string | null;
  baseCount: number | null;
  entreeCount: number | null;
  price: number;
  priceSource: string | null;
}

export interface Problem {
  row: number; // 1-based data row (header excluded)
  id: string;
  message: string;
}

const text = (value: string | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

// Returns null for blanks, NaN for anything that isn't a non-negative number.
function number(value: string | undefined): number | null {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number(raw.replace(/^\$/, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "Poly Canyon Village; Kennedy Library (Dexter Bldg)" -> ["Poly Canyon Village", "Kennedy Library"]
export function splitCampusAreas(value: string): string[] {
  return value
    .split(";")
    .map((part) =>
      part
        .replace(/\(.*?\)/g, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

export function toItemRecords(rows: CsvRow[]): {
  items: ItemRecord[];
  problems: Problem[];
} {
  const items: ItemRecord[] = [];
  const problems: Problem[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const restaurant = text(row.restaurant);
    const name = text(row.item_name);
    const id =
      text(row.id) ??
      (restaurant && name
        ? `${slugify(restaurant)}--${slugify(name)}`
        : "");
    const fail = (message: string) =>
      problems.push({ row: rowNumber, id, message });

    if (!restaurant || !name)
      return fail("missing restaurant or item_name");
    if (seen.has(id)) return fail("duplicate id");

    const areas = splitCampusAreas(row.campus_location ?? "");
    if (areas.length === 0)
      return fail("missing campus_location");

    const numbers = {
      price: number(row.price_usd),
      calories: number(row.calories),
      proteinG: number(row.protein_g),
      carbsG: number(row.carbs_g),
      fatG: number(row.fat_g)
    };
    const bad = Object.entries(numbers).find(([, value]) =>
      Number.isNaN(value)
    );
    if (bad)
      return fail(`${bad[0]} is not a non-negative number`);

    const component =
      text(row.meal_component)?.toLowerCase() ?? null;
    if (
      component !== null &&
      component !== "base" &&
      component !== "entree"
    ) {
      return fail(`unknown meal_component "${component}"`);
    }

    const collectedOn = text(row.collected_on);
    if (!collectedOn || Number.isNaN(Date.parse(collectedOn))) {
      return fail("collected_on is missing or not a date");
    }

    seen.add(id);
    items.push({
      sourceId: id,
      restaurant,
      campusAreas: areas,
      category: text(row.category) ?? "Other",
      name,
      serving: text(row.serving),
      price: numbers.price,
      priceSource:
        numbers.price === null ? null : text(row.price_source),
      calories:
        numbers.calories === null
          ? null
          : Math.round(numbers.calories),
      proteinG: numbers.proteinG,
      carbsG: numbers.carbsG,
      fatG: numbers.fatG,
      mealComponent: component,
      nutritionSource: text(row.nutrition_source),
      collectedOn: collectedOn.slice(0, 10),
      notes: text(row.notes)
    });
  });

  return { items, problems };
}

export function toComboRecords(rows: CsvRow[]): {
  combos: ComboRecord[];
  problems: Problem[];
} {
  const combos: ComboRecord[] = [];
  const problems: Problem[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const restaurant = text(row.restaurant);
    const name = text(row.combo);
    const id =
      restaurant && name
        ? `${slugify(restaurant)}--combo--${slugify(name)}`
        : "";
    const fail = (message: string) =>
      problems.push({ row: index + 1, id, message });

    if (!restaurant || !name)
      return fail("missing restaurant or combo");
    if (seen.has(id)) return fail("duplicate combo");

    const price = number(row.price_usd);
    const bases = number(row.bases);
    const entrees = number(row.entrees);
    if (price === null || Number.isNaN(price))
      return fail("price_usd is missing or invalid");
    if (Number.isNaN(bases) || Number.isNaN(entrees))
      return fail("bases/entrees must be whole numbers");

    seen.add(id);
    combos.push({
      sourceId: id,
      restaurant,
      name,
      description: text(row.description),
      baseCount: bases,
      entreeCount: entrees,
      price,
      priceSource: text(row.source)
    });
  });

  return { combos, problems };
}

// ---------- Stage 3: transform into database rows ----------

export interface LocationRow {
  name: string;
  restaurant: string;
  campus_area: string;
  description: string;
  accepts_dining_dollars: boolean;
}

export interface MealRow {
  source_id: string;
  name: string;
  restaurant: string;
  category: string;
  serving: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_component: string | null;
  nutrition_source: string | null;
  notes: string | null;
}

// Offerings reference meals and locations by natural key; the load stage swaps in the uuids.
export interface OfferingRow {
  meal_source_id: string;
  location_name: string;
  price: number;
  price_source: string | null;
  available: boolean;
  service_date: string;
}

export interface ComboRow {
  source_id: string;
  restaurant: string;
  name: string;
  description: string | null;
  base_count: number | null;
  entree_count: number | null;
  price: number;
  price_source: string | null;
}

export interface ImportPlan {
  locations: LocationRow[];
  meals: MealRow[];
  offerings: OfferingRow[];
  combos: ComboRow[];
  unpricedMeals: number;
}

export const locationName = (
  restaurant: string,
  campusArea: string
) => `${restaurant} (${campusArea})`;

export function buildImportPlan(
  items: ItemRecord[],
  combos: ComboRecord[]
): ImportPlan {
  const locations = new Map<string, LocationRow>();
  const meals: MealRow[] = [];
  const offerings: OfferingRow[] = [];
  let unpricedMeals = 0;

  for (const item of items) {
    for (const area of item.campusAreas) {
      const name = locationName(item.restaurant, area);
      if (!locations.has(name)) {
        locations.set(name, {
          name,
          restaurant: item.restaurant,
          campus_area: area,
          description: `${item.restaurant} at ${area}`,
          accepts_dining_dollars: true
        });
      }
    }

    meals.push({
      source_id: item.sourceId,
      name: item.name,
      restaurant: item.restaurant,
      category: item.category,
      serving: item.serving,
      calories: item.calories,
      protein_g: item.proteinG,
      carbs_g: item.carbsG,
      fat_g: item.fatG,
      meal_component: item.mealComponent,
      nutrition_source: item.nutritionSource,
      notes: item.notes
    });

    // Items without a standalone price (e.g. Panda entrees, sold only in combos) get no offering.
    if (item.price === null) {
      unpricedMeals++;
      continue;
    }
    for (const area of item.campusAreas) {
      offerings.push({
        meal_source_id: item.sourceId,
        location_name: locationName(item.restaurant, area),
        price: item.price,
        price_source: item.priceSource,
        available: true,
        service_date: item.collectedOn
      });
    }
  }

  return {
    locations: [...locations.values()],
    meals,
    offerings,
    combos: combos.map((combo) => ({
      source_id: combo.sourceId,
      restaurant: combo.restaurant,
      name: combo.name,
      description: combo.description,
      base_count: combo.baseCount,
      entree_count: combo.entreeCount,
      price: combo.price,
      price_source: combo.priceSource
    })),
    unpricedMeals
  };
}
