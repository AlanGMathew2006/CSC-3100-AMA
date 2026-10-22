# CSC-3100-AMA — PolyProvision

Campus dining planner: track nutrition and Dining Dollars, and get meal
recommendations. Requirements live in [CONTEXT.md](./CONTEXT.md).

```
apps/
  web/                # React + Vite + TypeScript client
packages/
  express-backend/    # Express + TypeScript API (Supabase Auth + Postgres)
    supabase/schema.sql   # tables, triggers, RLS policies
  shared/             # shared TypeScript types/utilities
```

## Getting started

```powershell
npm install
```

Copy the env templates and fill in your Supabase project values:

- `apps/web/.env.example` → `apps/web/.env.local`
- `packages/express-backend/.env.example` → `packages/express-backend/.env`

In Supabase **Authentication → URL Configuration**, add the web app's
password-reset URL to **Redirect URLs** (for local development,
`http://localhost:5173/reset-password`; add the equivalent URL for each
deployed web-app origin). The app sends password-reset emails back to this
route, where the user can choose a new password.

For an existing Supabase project, apply these SQL migrations in order in the
SQL editor (or with the Supabase CLI):

1. `packages/express-backend/supabase/migrations/20261015000000_google_onboarding_profile.sql`
2. `packages/express-backend/supabase/migrations/20261015010000_defer_all_profiles_until_onboarding.sql`
3. `packages/express-backend/supabase/migrations/20261022000000_design_preferences.sql`

If the first migration was already applied, apply the second and third. For a
new project, run `packages/express-backend/supabase/schema.sql`. New email and
Google users then receive their profile only when onboarding is submitted.
Start both the web app and API from the repository root:

```powershell
npm run dev
```

The web app runs on `http://localhost:5173` and the API on
`http://localhost:8000`. To run only the API, use
`npm run dev --workspace=packages/express-backend`.

Other scripts: `npm run build`, `npm run lint`, `npm run test`.

Never commit `.env` files or the Supabase service-role key.
