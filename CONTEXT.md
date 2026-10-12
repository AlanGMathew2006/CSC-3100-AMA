# PolyProvision — AI Coding Context

# Project purpose

PolyProvision is a mobile-first campus dining planner for Cal
Poly students who use Dining Dollars. It helps students choose
currently available dining-hall meals that fit their nutrition
goals, dietary needs, preferences, location, and remaining
Dining Dollar budget. The product should make this question easy
to answer: “What should I eat on campus right now that helps me
meet my goals without overspending?”

# Primary users

- First- and second-year Cal Poly students with Dining Dollar
  meal plans.
- Students who want to track calories and macronutrients,
  especially protein, carbohydrates, and fat.
- Students who need dietary/allergen filters or want convenient
  campus dining locations.

# Current product scope

# Core MVP user journey:

1. Student creates an account or logs in.
2. First-time student enters Dining Dollar balance, a daily
   spending target, nutrition goals, dietary restrictions,
   preferred locations, and food preferences.
3. Student views current meal recommendations.
4. The system filters unavailable or incompatible meals, then
   ranks remaining meals by nutrition-goal fit, Dining Dollar
   value, and preferences.
5. Student views a meal’s price, macros, allergens, location,
   and availability.
6. Student saves or logs a meal.
7. The dashboard updates the remaining Dining Dollar balance and
   daily/weekly nutrition progress.

# Important alternate states:

- No matching meals: explain why and allow the student to adjust
  filters or view closest matches.
- Meal exceeds daily budget: warn the student and offer
  lower-cost alternatives.
- Live menu data is unavailable: show the last synced data and a
  retry action.

# Current technology and folder conventions

- The current client is a React + TypeScript + Vite web app.
- The web app lives in apps/web.
- Run the web app from that folder with npm run dev.
- Do not run npx expo start for apps/web; Vite code is not an
  Expo project.
- The current app uses web React and CSS. It should remain
  responsive and mobile-first.
- Supabase is the planned backend for Auth, PostgreSQL data, and
  Row Level Security (RLS).

# Future native-mobile direction

If the team later adopts native mobile, create a separate
Expo/React Native client at apps/mobile. Do not replace or
silently convert the Vite web app. The two clients may share
TypeScript types, API contracts, recommendation logic, and the
same Supabase backend, but React web UI components and CSS must
be rewritten with React Native components and styles.

# Product and UI requirements

- Keep the app mobile-first, accessible, and easy to scan on a
  phone.
- Preserve the established PolyProvision visual identity unless
  explicitly asked to redesign it:
  - Centered PolyProvision text header.
  - Poly uses deep green; Provision uses Vegas Gold.
  - Bottom navigation has a green background, white inactive
    icons, and gold active icons.
- Main screens: welcome/onboarding, log in, sign up,
  goals/preferences, dashboard, recommendations, meal details,
  saved meals/history, and profile/settings.
- Dashboard should show daily and weekly progress for calories,
  protein, carbohydrates, and fat. Use clearly differentiated
  colors for macro progress.
- Every recommendation should provide a short explanation, such
  as “High protein and within today’s Dining Dollar target.”

# Recommendation rules

Recommendations must be explainable and deterministic for the
MVP. Do not add AI agents, LLM APIs, or paid third-party AI
services unless explicitly requested. When ranking a meal,
consider:

1. Availability and dining-hall hours.
2. Dietary restrictions, allergens, excluded foods, preferred
   locations, and cuisine preferences.
3. Remaining calorie and macro targets.
4. Remaining Dining Dollar balance and daily spending target.
5. A balance of nutrition fit and Dining Dollar value—not simply
   the cheapest meal.

# Data model expectations

Use these core concepts consistently:

- profiles: user identity, Dining Dollar balance, daily spending
  target, onboarding status.
- user_goals: calorie, protein, carbohydrate, fat, and optional
  fiber targets.
- user_preferences: dietary restrictions, allergens,
  cuisine/location preferences, excluded foods.
- dining_locations: campus location names and hours.
- meals: canonical nutrition/allergen information.
- menu_offerings: live location-specific price, availability,
  and service date.
- meal_logs: historical logged meals with price/nutrition
  snapshots.
- saved_meals: bookmarked meals. Do not claim a specific Cal
  Poly dining API exists unless it has been verified. Until
  then, refer to the integration as Live Dining Menu & Nutrition
  Data Source/API.

# Security and backend rules

- Never expose SUPABASE_SERVICE_ROLE_KEY in frontend code,
  committed files, or client-visible environment variables.
- Use public/publishable Supabase credentials only in the
  client, with RLS enabled.
- Users may access only their own profile, goals, preferences,
  meal logs, and saved meals.
- Menu data should be readable by authenticated users, but
  client applications must not be allowed to write menu data.
- Live menu imports/sync jobs belong in a protected server-side
  process.
- Use environment variables for all credentials. Update
  .env.example when adding a new required variable, but never
  put real credentials in examples.

# AI coding-agent operating rules

Before editing:

1. Inspect the relevant files, existing components, package
   scripts, and conventions.
2. State a short plan and identify assumptions.
3. Prefer the smallest change that satisfies the request.
4. Preserve existing user work, file structure, styles, and
   unrelated features.

While editing:

- Make focused, readable TypeScript changes.
- Reuse existing components and styles before creating new
  abstractions.
- Make functions loosely coupled and not hard coded
- Do not refactor the entire app, replace screens, rename broad
  folders, or install packages unless required for the requested
  task.
- Do not fabricate backend responses or mark an external
  integration as complete when it is only mocked.
- Keep mock data clearly labeled as mock/seed data.
- Do not run destructive database commands, delete files, reset
  git history, or apply remote migrations without explicit
  approval.

After editing:

1. Run the relevant available checks (npm run lint, npm run
   typecheck, npm run build, or the project equivalent) when
   safe.
2. Report files changed, what changed, tests run, and any
   remaining manual step.
3. Call out blocked items or missing credentials instead of
   guessing.

# Preferred implementation sequence

1. Finish responsive web UI and prototype flows.
2. Add Supabase Auth, profiles, goals, and preferences.
3. Add locations, meals, and menu offerings with controlled seed
   data.
4. Implement meal logging, saved meals, and dashboard progress.
5. Implement deterministic recommendation ranking and
   explanations.
6. Add a verified live menu-data integration and protected sync
   job.
7. Add deployment/observability improvements after the MVP
   works.

# Definition of done for a feature

A feature is done only when it:

- Works through the intended user flow.
- Handles loading, empty, and error states where relevant.
- Fits the established PolyProvision UI and mobile layout.
- Protects user data appropriately.
- Has no known TypeScript/build errors.
- Does not silently break another screen or existing flow.
