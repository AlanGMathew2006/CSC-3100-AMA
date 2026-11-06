# CSC-3100-AMA — PolyProvision

Campus dining planner: track nutrition and Dining Dollars, and
get meal recommendations. Requirements live in
[CONTEXT.md](./CONTEXT.md).

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
- `packages/express-backend/.env.example` →
  `packages/express-backend/.env`

In Supabase **Authentication → URL Configuration**, add the web
app's password-reset URL to **Redirect URLs** (for local
development, `http://localhost:5173/reset-password`; add the
equivalent URL for each deployed web-app origin). The app sends
password-reset emails back to this route, where the user can
choose a new password.

For an existing Supabase project, apply these SQL migrations in
order in the SQL editor (or with the Supabase CLI):

1. `packages/express-backend/supabase/migrations/20261015000000_google_onboarding_profile.sql`
2. `packages/express-backend/supabase/migrations/20261015010000_defer_all_profiles_until_onboarding.sql`
3. `packages/express-backend/supabase/migrations/20261022000000_design_preferences.sql`

If the first migration was already applied, apply the second and
third. For a new project, run
`packages/express-backend/supabase/schema.sql`. New email and
Google users then receive their profile only when onboarding is
submitted. Start both the web app and API from the repository
root:

```powershell
npm run dev
```

The web app runs on `http://localhost:5173` and the API on
`http://localhost:8000`. To run only the API, use
`npm run dev --workspace=packages/express-backend`.

Other scripts: `npm run build`, `npm run lint`, `npm run test`.

Never commit `.env` files or the Supabase service-role key.

## Run the full app with Docker

Docker Compose starts the web app and API together. Supabase
remains an external service, so each teammate needs access to a
configured Supabase project and its database schema.

1. Install and start Docker Desktop.
2. Copy `.env.example` to `.env` and set `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` to the values for your Supabase
   project.
3. Apply the database schema or migrations described above.
4. In Supabase **Authentication → URL Configuration**, add
   `http://localhost:8080/reset-password` to **Redirect URLs**.
   To let peers open the app from another machine, also allow
   the host machine's app URL, such as
   `http://192.168.1.20:8080/reset-password`.
5. From the repository root, run:

   ```powershell
   docker compose up --build
   ```

Open `http://localhost:8080` (or the port set by `WEB_PORT`).
Peers on the same network can use
`http://<host-machine-ip>:<port>` if the host firewall allows
inbound connections on that port. Stop the app with `Ctrl+C`;
run `docker compose down` to stop and remove its containers.

The web container serves the frontend and proxies API requests
to the API container, so the browser uses the same address for
both. This makes the app available on the local network; sharing
it over the public internet requires deploying it or using a
secure tunnel. Never commit `.env` files or a Supabase
service-role key.

# Authentication Sequence Diagram 

1. New-Account Sequence Diagram
<img width="1182" height="1363" alt="Poly Provision UML Diagram-New_Account_Sequence_Diagram drawio (1)" src="https://github.com/user-attachments/assets/1f75f1ae-c009-4fef-8fbf-5ab50b83a060" />


2. Sign-In Sequence Diagram
<img width="1182" height="1073" alt="Poly Provision UML Diagram-Sign-In_Sequence_Diagram drawio" src="https://github.com/user-attachments/assets/0663fab6-bb7f-4ba0-9610-4a4228a479cb" />


