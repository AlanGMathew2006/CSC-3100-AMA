import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserClient } from "./services/supabase.js";
import * as menu from "./services/menu-service.js";
import * as recommendations from "./services/recommendation-service.js";
import * as svc from "./services/user-service.js";

interface AuthedRequest extends Request {
  db: SupabaseClient;
  userId: string;
}

const app = express();
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim()),
  }),
);
app.use(express.json());

// Verifies the Supabase access token and attaches a user-scoped client (RLS applies).
const requireAuth: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Missing access token" });
    return;
  }

  const db = createUserClient(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired access token" });
    return;
  }
  (req as AuthedRequest).db = db;
  (req as AuthedRequest).userId = data.user.id;
  next();
};

const handle =
  (fn: (req: AuthedRequest, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next: NextFunction) => {
    Promise.resolve(fn(req as AuthedRequest, res)).then((body) => {
      if (body !== undefined) res.json(body);
    }, next);
  };

const queryString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const isoDate = (value: unknown): string | undefined => {
  const text = queryString(value);
  return text && !Number.isNaN(Date.parse(text)) ? text : undefined;
};

// Optional whole-number query param within [min, max]; null means present but invalid.
const queryInt = (
  value: unknown,
  min: number,
  max: number,
): number | undefined | null => {
  if (value === undefined) return undefined;
  const text = queryString(value);
  if (!text || !/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return parsed >= min && parsed <= max ? parsed : null;
};

// Returns an error message when any listed field is present but not a non-negative number.
function invalidNumber(body: unknown, keys: string[]): string | null {
  const record = (body ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return `${key} must be a non-negative number`;
    }
  }
  return null;
}

const GOAL_KEYS = ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"];
const PROFILE_KEYS = ["dining_dollars_balance", "daily_spending_target"];
const ONBOARDING_KEYS = [
  "dining_dollars_balance",
  "daily_spending_target",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
];
const MEAL_LOG_KEYS = ["price", ...GOAL_KEYS];

const validate =
  (keys: string[]): RequestHandler =>
  (req, res, next) => {
    const problem = invalidNumber(req.body, keys);
    if (problem) {
      res.status(400).json({ error: problem });
      return;
    }
    next();
  };

const validateIntegers =
  (keys: string[]): RequestHandler =>
  (req, res, next) => {
    const record = (req.body ?? {}) as Record<string, unknown>;
    const invalid = keys.find(
      (key) =>
        record[key] !== undefined &&
        record[key] !== null &&
        !Number.isInteger(record[key]),
    );
    if (invalid) {
      res.status(400).json({ error: `${invalid} must be a whole number` });
      return;
    }
    next();
  };

const validateStringArrays =
  (keys: string[]): RequestHandler =>
  (req, res, next) => {
    const record = (req.body ?? {}) as Record<string, unknown>;
    const invalid = keys.find(
      (key) =>
        record[key] !== undefined &&
        (!Array.isArray(record[key]) ||
          !(record[key] as unknown[]).every(
            (value) => typeof value === "string" && value.length <= 100,
          )),
    );
    if (invalid) {
      res.status(400).json({ error: `${invalid} must be an array of strings` });
      return;
    }
    next();
  };

const validatePreferenceSettings: RequestHandler = (req, res, next) => {
  const record = (req.body ?? {}) as Record<string, unknown>;
  if (
    record.budget_alerts_enabled !== undefined &&
    typeof record.budget_alerts_enabled !== "boolean"
  ) {
    res.status(400).json({ error: "budget_alerts_enabled must be a boolean" });
    return;
  }
  if (
    record.theme !== undefined &&
    record.theme !== "light" &&
    record.theme !== "dark"
  ) {
    res.status(400).json({ error: "theme must be light or dark" });
    return;
  }
  next();
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", requireAuth);

app.get("/api/profile", handle((req) => svc.getProfile(req.db, req.userId)));
app.patch(
  "/api/profile",
  validate(PROFILE_KEYS),
  handle((req) => svc.updateProfile(req.db, req.userId, req.body)),
);

app.get("/api/goals", handle((req) => svc.getGoals(req.db, req.userId)));
app.put(
  "/api/goals",
  validate(GOAL_KEYS),
  handle((req) => svc.upsertGoals(req.db, req.userId, req.body)),
);
app.post(
  "/api/onboarding/complete",
  validate(ONBOARDING_KEYS),
  validateIntegers(["calories", "protein_g", "carbs_g", "fat_g"]),
  validateStringArrays([
    "nutrition_priorities",
    "dietary_restrictions",
    "preferred_location_ids",
  ]),
  handle((req, res) => {
    const missing = ONBOARDING_KEYS.find(
      (key) => typeof req.body?.[key] !== "number",
    );
    if (missing) {
      res.status(400).json({ error: `${missing} is required` });
      return;
    }
    return svc.completeOnboarding(req.db, req.body);
  }),
);

app.get(
  "/api/preferences",
  handle((req) => svc.getPreferences(req.db, req.userId)),
);
app.put(
  "/api/preferences",
  validateStringArrays([
    "dietary_restrictions",
    "allergens",
    "cuisine_preferences",
    "preferred_location_ids",
    "excluded_foods",
    "nutrition_priorities",
  ]),
  validatePreferenceSettings,
  handle((req) => svc.upsertPreferences(req.db, req.userId, req.body)),
);

app.get("/api/locations", handle((req) => svc.listLocations(req.db)));
// Full imported campus menu: every item with its latest price per location, plus combos.
// ?open_now=true drops offerings at closed locations (unknown hours stay, with open_status "unknown").
app.get(
  "/api/menu",
  handle((req) =>
    menu.getMenu(req.db, { openNow: queryString(req.query.open_now) === "true" }),
  ),
);
// Per-meal targets and budget, and the optimizer's top locations (see recommendation-service.ts).
const recommendationOptions = (req: AuthedRequest, res: Response) => {
  const limit = queryInt(req.query.limit, 1, 10);
  const mealsRemaining = queryInt(req.query.meals_remaining, 1, 6);
  if (limit === null || mealsRemaining === null) {
    res.status(400).json({
      error: "limit must be 1-10 and meals_remaining must be 1-6",
    });
    return null;
  }
  return {
    at: new Date(),
    limit: limit ?? 3,
    mealsRemaining,
    locationId: queryString(req.query.location_id) || undefined,
  };
};
app.get(
  "/api/meal-targets",
  handle((req, res) => {
    const options = recommendationOptions(req, res);
    return options ? recommendations.getMealTargets(req.db, req.userId, options) : undefined;
  }),
);
app.get(
  "/api/recommendations",
  handle((req, res) => {
    const options = recommendationOptions(req, res);
    return options ? recommendations.getRecommendations(req.db, req.userId, options) : undefined;
  }),
);

app.get(
  "/api/menu-offerings",
  handle((req) =>
    svc.listOfferings(req.db, {
      locationId: queryString(req.query.location_id),
      serviceDate: queryString(req.query.service_date),
    }),
  ),
);

app.get(
  "/api/dashboard",
  handle((req) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));
    return svc.getDashboard(req.db, req.userId, {
      dayStart: isoDate(req.query.day_start) ?? startOfDay.toISOString(),
      weekStart: isoDate(req.query.week_start) ?? startOfWeek.toISOString(),
    });
  }),
);

app.get(
  "/api/meal-logs",
  handle((req) =>
    svc.listMealLogs(req.db, req.userId, {
      from: queryString(req.query.from),
      to: queryString(req.query.to),
    }),
  ),
);
app.post(
  "/api/meal-logs",
  validate(MEAL_LOG_KEYS),
  handle(async (req, res) => {
    if (typeof req.body?.name !== "string" || !req.body.name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    res.status(201).json(await svc.createMealLog(req.db, req.userId, req.body));
  }),
);
app.delete(
  "/api/meal-logs/:logId",
  handle(async (req, res) => {
    await svc.deleteMealLog(req.db, req.userId, String(req.params.logId));
    res.status(204).end();
  }),
);

app.get(
  "/api/saved-meals",
  handle((req) => svc.listSavedMeals(req.db, req.userId)),
);
app.put(
  "/api/saved-meals/:mealId",
  handle((req) => svc.saveMeal(req.db, req.userId, String(req.params.mealId))),
);
app.delete(
  "/api/saved-meals/:mealId",
  handle(async (req, res) => {
    await svc.unsaveMeal(req.db, req.userId, String(req.params.mealId));
    res.status(204).end();
  }),
);

// Express identifies error handlers by their four-argument signature.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
  res.status(400).json({ error: message ?? "Request failed" });
});

const port = Number(process.env.PORT ?? 8000);
app.listen(port, () => console.log(`Backend listening on port ${port}`));
