// Menu import pipeline (pipe and filter, see TE4).
// Each stage is a pure function so it can be tested without Supabase:
//   CSV text -> parseCsv -> toItemRecords / toComboRecords (clean + validate) -> buildImportPlan (transform)
//   dining_hours.json -> JSON.parse -> toHoursRecords (clean + validate) -> buildImportPlan
//   serving_windows.json -> JSON.parse -> toServingWindowRules (clean + validate) -> applyServingWindows (filter)
//   meal_roles.json -> JSON.parse -> toMealRoleRules (clean + validate) -> applyMealRoles (filter)
// The load stage (writing to Supabase) lives in ../import-menu.ts.

import {
  ALLERGENS,
  DAY_KEYS,
  DIETARY_TAGS,
  MEAL_ROLES,
  parseClockTime,
  type MealRole,
  type ServingWindows,
  type WeeklyHours
} from "@csc-3100-ama/shared";

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
  allergens: string[];
  tags: string[];
  allergensVerified: boolean;
  allergenSource: string | null;
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

// "milk|egg" -> ["milk", "egg"]; returns the first value not in `allowed` as `bad`.
function pipeList(
  value: string | undefined,
  allowed: readonly string[]
): { values: string[]; bad: string | null } {
  const values = (text(value) ?? "")
    .split("|")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const bad = values.find((part) => !allowed.includes(part)) ?? null;
  return { values: [...new Set(values)], bad };
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

    const allergens = pipeList(row.allergens, ALLERGENS);
    if (allergens.bad) return fail(`unknown allergen "${allergens.bad}"`);
    const tags = pipeList(row.tags, DIETARY_TAGS);
    if (tags.bad) return fail(`unknown tag "${tags.bad}"`);
    // Blank (older CSVs without the column) means not verified.
    const verifiedFlag = text(row.allergens_verified)?.toLowerCase() ?? "no";
    if (verifiedFlag !== "yes" && verifiedFlag !== "no")
      return fail("allergens_verified must be yes or no");
    const allergensVerified = verifiedFlag === "yes";
    const allergenSource = text(row.allergen_source);
    if (allergensVerified && !allergenSource)
      return fail("allergen_source is required when allergens_verified is yes");
    if (!allergensVerified && (allergens.values.length || tags.values.length))
      return fail("allergens/tags are set but allergens_verified is not yes");

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
      notes: text(row.notes),
      allergens: allergens.values,
      tags: tags.values,
      allergensVerified,
      allergenSource: allergensVerified ? allergenSource : null
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

export interface HoursRecord {
  locationName: string;
  hours: WeeklyHours | null; // null = not verified yet
  source: string | null;
  collectedOn: string | null;
}

// Checks one location's hours: all seven days present, each a list of HH:MM windows.
function hoursProblem(hours: unknown): string | null {
  if (typeof hours !== "object" || hours === null || Array.isArray(hours))
    return "hours must be an object or null";
  const record = hours as Record<string, unknown>;
  const unknownDay = Object.keys(record).find(
    (key) => !(DAY_KEYS as readonly string[]).includes(key)
  );
  if (unknownDay) return `unknown day "${unknownDay}"`;
  for (const day of DAY_KEYS) {
    const windows = record[day];
    if (!Array.isArray(windows))
      return `${day} is missing (use [] for a closed day)`;
    for (const window of windows as Record<string, unknown>[]) {
      if (
        parseClockTime(window?.open) === null ||
        parseClockTime(window?.close) === null
      ) {
        return `${day} has a window without valid HH:MM open/close times`;
      }
    }
  }
  return null;
}

// Parsed data/dining_hours.json -> one record per location name.
// Invalid entries are reported and dropped, so that location's hours stay unknown.
export function toHoursRecords(data: unknown): {
  hours: HoursRecord[];
  problems: Problem[];
} {
  const hours: HoursRecord[] = [];
  const problems: Problem[] = [];
  const list = (data as { locations?: unknown } | null)?.locations;
  if (!Array.isArray(list)) {
    problems.push({
      row: 0,
      id: "",
      message: 'expected a top-level "locations" array'
    });
    return { hours, problems };
  }
  const seen = new Set<string>();

  list.forEach((entry: Record<string, unknown>, index) => {
    const name =
      typeof entry?.name === "string" ? entry.name.trim() : "";
    const fail = (message: string) =>
      problems.push({ row: index + 1, id: name, message });

    if (!name) return fail("missing name");
    if (seen.has(name)) return fail("duplicate location");
    const value = entry.hours ?? null;
    if (value !== null) {
      const problem = hoursProblem(value);
      if (problem) return fail(problem);
    }
    const collectedOn =
      typeof entry.collected_on === "string"
        ? text(entry.collected_on)
        : null;
    if (value !== null && (!collectedOn || Number.isNaN(Date.parse(collectedOn))))
      return fail("collected_on is missing or not a date");
    if (value !== null && typeof entry.source !== "string")
      return fail("source is required when hours are set");

    seen.add(name);
    hours.push({
      locationName: name,
      hours: value as WeeklyHours | null,
      source: typeof entry.source === "string" ? text(entry.source) : null,
      collectedOn: collectedOn?.slice(0, 10) ?? null
    });
  });

  return { hours, problems };
}

export interface MealWindowRule {
  restaurant: string;
  category: string;
  windows: ServingWindows;
}

export interface ComboWindowRule {
  restaurant: string;
  descriptionPrefix: string;
  windows: ServingWindows;
}

export interface ServingWindowRules {
  mealRules: MealWindowRule[];
  comboRules: ComboWindowRule[];
  overrides: { sourceId: string; windows: ServingWindows }[]; // by meal or combo source_id
}

// Parsed data/serving_windows.json -> rules. `windows` is the hours format, "unknown",
// or null (all day, overrides only). Invalid entries are reported and dropped.
export function toServingWindowRules(data: unknown): {
  rules: ServingWindowRules;
  problems: Problem[];
} {
  const rules: ServingWindowRules = {
    mealRules: [],
    comboRules: [],
    overrides: []
  };
  const problems: Problem[] = [];
  const record = (data ?? {}) as Record<string, unknown>;

  const section = (
    key: string,
    allowNull: boolean,
    each: (entry: Record<string, unknown>, windows: ServingWindows) => string | null
  ) => {
    const list = record[key] ?? [];
    if (!Array.isArray(list)) {
      problems.push({ row: 0, id: key, message: `${key} must be an array` });
      return;
    }
    list.forEach((entry: Record<string, unknown>, index) => {
      const fail = (message: string) =>
        problems.push({ row: index + 1, id: key, message });
      const windows = entry?.windows ?? null;
      if (windows === null && !allowNull)
        return fail("windows must be hours or \"unknown\"");
      if (windows !== null && windows !== "unknown") {
        const problem = hoursProblem(windows);
        if (problem) return fail(problem);
        if (typeof entry.source !== "string" || !entry.source.trim())
          return fail("source is required when windows are set");
      }
      if (typeof entry.verified !== "string" || !entry.verified.trim())
        return fail("verified note is required");
      const problem = each(entry, windows as ServingWindows);
      if (problem) fail(problem);
    });
  };

  section("meal_rules", false, (entry, windows) => {
    const restaurant = typeof entry.restaurant === "string" ? text(entry.restaurant) : null;
    const category = typeof entry.category === "string" ? text(entry.category) : null;
    if (!restaurant || !category) return "restaurant and category are required";
    rules.mealRules.push({ restaurant, category, windows });
    return null;
  });
  section("combo_rules", false, (entry, windows) => {
    const restaurant = typeof entry.restaurant === "string" ? text(entry.restaurant) : null;
    const descriptionPrefix =
      typeof entry.description_prefix === "string" ? text(entry.description_prefix) : null;
    if (!restaurant || !descriptionPrefix)
      return "restaurant and description_prefix are required";
    rules.comboRules.push({ restaurant, descriptionPrefix, windows });
    return null;
  });
  const seen = new Set<string>();
  section("overrides", true, (entry, windows) => {
    const sourceId = typeof entry.source_id === "string" ? text(entry.source_id) : null;
    if (!sourceId) return "source_id is required";
    if (seen.has(sourceId)) return "duplicate source_id";
    seen.add(sourceId);
    rules.overrides.push({ sourceId, windows });
    return null;
  });

  return { rules, problems };
}

// ---------- Stage 3: transform into database rows ----------

export interface LocationRow {
  name: string;
  restaurant: string;
  campus_area: string;
  description: string;
  accepts_dining_dollars: boolean;
  hours: WeeklyHours; // {} = unknown
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
  allergens: string[]; // [] with allergens_verified = false means unknown
  tags: string[];
  allergens_verified: boolean;
  allergen_source: string | null;
  serving_windows: ServingWindows; // null = whenever the location is open
  meal_role: MealRole | null; // set by applyMealRoles; the import refuses rows without one
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
  serving_windows: ServingWindows;
}

export interface ImportPlan {
  locations: LocationRow[];
  meals: MealRow[];
  offerings: OfferingRow[];
  combos: ComboRow[];
  unpricedMeals: number;
  locationsWithoutHours: string[];
  unmatchedHours: string[]; // names in dining_hours.json with no matching location
}

export const locationName = (
  restaurant: string,
  campusArea: string
) => `${restaurant} (${campusArea})`;

export function buildImportPlan(
  items: ItemRecord[],
  combos: ComboRecord[],
  hours: HoursRecord[] = []
): ImportPlan {
  const hoursByName = new Map(
    hours.map((record) => [record.locationName, record.hours])
  );
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
          accepts_dining_dollars: true,
          // Always written, so re-importing a null entry clears stale hours.
          hours: hoursByName.get(name) ?? {}
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
      notes: item.notes,
      allergens: item.allergens,
      tags: item.tags,
      allergens_verified: item.allergensVerified,
      allergen_source: item.allergenSource,
      serving_windows: null,
      meal_role: null
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
      price_source: combo.priceSource,
      serving_windows: null
    })),
    unpricedMeals,
    locationsWithoutHours: [...locations.values()]
      .filter((location) => Object.keys(location.hours).length === 0)
      .map((location) => location.name),
    unmatchedHours: hours
      .map((record) => record.locationName)
      .filter((name) => !locations.has(name))
  };
}

// ---------- Stage 4: filter, apply item serving windows ----------

// Sets serving_windows on meals (by restaurant + category) and combos (by restaurant + description
// prefix); overrides by source_id win. Rows no rule matches are served all day (null), so a
// re-import always writes the current rules. `unmatched` lists rules/overrides that matched nothing.
export function applyServingWindows(
  plan: ImportPlan,
  rules: ServingWindowRules
): { plan: ImportPlan; unmatched: string[] } {
  const used = new Set<string>();
  const overrides = new Map(
    rules.overrides.map((o) => [o.sourceId, o.windows])
  );
  const pick = (sourceId: string, ruleWindows: () => [string, ServingWindows] | null) => {
    if (overrides.has(sourceId)) {
      used.add(`override ${sourceId}`);
      return overrides.get(sourceId) ?? null;
    }
    const match = ruleWindows();
    if (!match) return null;
    used.add(match[0]);
    return match[1];
  };

  const meals = plan.meals.map((meal) => ({
    ...meal,
    serving_windows: pick(meal.source_id, () => {
      const rule = rules.mealRules.find(
        (r) =>
          r.restaurant === meal.restaurant &&
          r.category.toLowerCase() === meal.category.toLowerCase()
      );
      return rule ? [`meal rule ${rule.restaurant} / ${rule.category}`, rule.windows] : null;
    })
  }));
  const combos = plan.combos.map((combo) => ({
    ...combo,
    serving_windows: pick(combo.source_id, () => {
      const rule = rules.comboRules.find(
        (r) =>
          r.restaurant === combo.restaurant &&
          (combo.description ?? "").startsWith(r.descriptionPrefix)
      );
      return rule
        ? [`combo rule ${rule.restaurant} / ${rule.descriptionPrefix}`, rule.windows]
        : null;
    })
  }));

  const unmatched = [
    ...rules.mealRules.map((r) => `meal rule ${r.restaurant} / ${r.category}`),
    ...rules.comboRules.map((r) => `combo rule ${r.restaurant} / ${r.descriptionPrefix}`),
    ...rules.overrides.map((o) => `override ${o.sourceId}`)
  ].filter((name) => !used.has(name));
  return { plan: { ...plan, meals, combos }, unmatched };
}

// ---------- Meal roles ----------

export interface MealRoleRules {
  rules: { restaurant: string; category: string; role: MealRole }[];
  overrides: { sourceId: string; role: MealRole }[];
}

const isRole = (value: unknown): value is MealRole =>
  typeof value === "string" && (MEAL_ROLES as readonly string[]).includes(value);

// Parsed data/meal_roles.json -> rules by restaurant + category, overrides by source_id.
export function toMealRoleRules(data: unknown): {
  rules: MealRoleRules;
  problems: Problem[];
} {
  const rules: MealRoleRules = { rules: [], overrides: [] };
  const problems: Problem[] = [];
  const record = (data ?? {}) as Record<string, unknown>;
  const list = (key: string) => {
    const value = record[key] ?? [];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    problems.push({ row: 0, id: key, message: `${key} must be an array` });
    return [];
  };
  const str = (value: unknown) =>
    typeof value === "string" ? text(value) : null;

  const seenRules = new Set<string>();
  list("rules").forEach((entry, index) => {
    const fail = (message: string) =>
      problems.push({ row: index + 1, id: "rules", message });
    const restaurant = str(entry?.restaurant);
    const category = str(entry?.category);
    if (!restaurant || !category) return fail("restaurant and category are required");
    if (!isRole(entry.role)) return fail(`unknown role "${String(entry.role)}"`);
    const key = `${restaurant}|${category.toLowerCase()}`;
    if (seenRules.has(key)) return fail("duplicate rule");
    seenRules.add(key);
    rules.rules.push({ restaurant, category, role: entry.role });
  });
  const seen = new Set<string>();
  list("overrides").forEach((entry, index) => {
    const fail = (message: string) =>
      problems.push({ row: index + 1, id: "overrides", message });
    const sourceId = str(entry?.source_id);
    if (!sourceId) return fail("source_id is required");
    if (!isRole(entry.role)) return fail(`unknown role "${String(entry.role)}"`);
    if (seen.has(sourceId)) return fail("duplicate source_id");
    seen.add(sourceId);
    rules.overrides.push({ sourceId, role: entry.role });
  });
  return { rules, problems };
}

// Sets meal_role on every meal. `missing` lists meals no rule or override covers (the import
// refuses to load those); `unmatched` lists overrides that point at no meal.
export function applyMealRoles(
  plan: ImportPlan,
  rules: MealRoleRules
): { plan: ImportPlan; missing: string[]; unmatched: string[] } {
  const overrides = new Map(rules.overrides.map((o) => [o.sourceId, o.role]));
  const meals = plan.meals.map((meal) => ({
    ...meal,
    meal_role:
      overrides.get(meal.source_id) ??
      rules.rules.find(
        (r) =>
          r.restaurant === meal.restaurant &&
          r.category.toLowerCase() === meal.category.toLowerCase()
      )?.role ??
      null
  }));
  const ids = new Set(plan.meals.map((meal) => meal.source_id));
  return {
    plan: { ...plan, meals },
    missing: meals.filter((m) => m.meal_role === null).map((m) => m.source_id),
    unmatched: rules.overrides
      .map((o) => o.sourceId)
      .filter((id) => !ids.has(id))
  };
}
