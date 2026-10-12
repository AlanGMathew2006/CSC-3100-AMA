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

Run `packages/express-backend/supabase/schema.sql` in the Supabase SQL editor,
then start both servers:

```powershell
npm run dev --workspace=packages/express-backend   # API on :8000
npm run dev                                         # web on :5173
```

Other scripts: `npm run build`, `npm run lint`, `npm run test`.

Never commit `.env` files or the Supabase service-role key.
