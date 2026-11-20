# Testing

## Selected tools and testing levels

- **Unit tests:** Node's built-in `node:test` runner with `tsx`
  runs the shared package and backend unit tests. Tests focus on
  small functions and services.
- **Component/UI tests:** Vitest with React Testing Library and
  jsdom tests web user interactions; Jest with React Native
  Testing Library tests mobile screens. These tests interact
  with accessible labels, buttons, and visible messages rather
  than component state.
- **Integration/system tests:** Node's `node:test` runner and
  `fetch` exercise backend HTTP routes together with service and
  data-access boundaries.
- **End-to-end tests:** Playwright runs browser journeys against
  the web app with stubbed API and authentication behavior.

The signup UI journey in
`apps/web/src/pages/auth/SignupPage.test.tsx` verifies that a
user sees a validation error for an invalid email domain, and
that a valid signup reaches the confirmation screen with the
normalized email address.

## Install and run

Install repository dependencies from the root:

```sh
npm install
```

Run the configured web, shared, and backend
unit/component/system suites:

```sh
npm test
```

Run mobile tests (this builds the shared package before Jest):

```sh
npm run test:mobile
```

Run backend system tests only:

```sh
npm run test:system
```

Run browser end-to-end tests. Install the Playwright Chromium
browser once from `apps/web` if it is not already installed:

```sh
cd apps/web
npx playwright install chromium
npm run test:e2e
```

Useful focused commands from the repository root:

```sh
npm run test --workspace=packages/shared
npm run test --workspace=packages/express-backend
npm run test --workspace=apps/web -- src/pages/auth/SignupPage.test.tsx
npm run test --workspace=apps/mobile -- src/lib/validation.test.ts
```

## System-test scope

The backend system tests in
`packages/express-backend/services/system.test.ts` cover:

- `GET /api/menu` through HTTP routing, the menu service, and
  data access.
- `POST /api/meal-logs` through HTTP routing, authentication
  injection, request validation, the user service, and data
  access.

The tests use Node's built-in `fetch` API and start a temporary
local HTTP server. Authentication and Supabase data access are
replaced with deterministic test doubles.

## External services and test data

The automated tests do not require a live Supabase project,
external API, environment variables, or test database:

- Backend unit and system tests inject fake database and
  authentication behavior.
- Web component tests mock Supabase and use local test data.
- Mobile component tests mock authentication.
- Playwright starts the local Vite server with stub Supabase/API
  environment values and intercepts application requests.

The normal app still requires the environment setup described in
`README.md`.

## Known limitations and future tests

Backend system tests use mocked data-access responses and do not
exercise live Supabase queries or RLS policies. Playwright
currently covers web browser journeys, not native mobile
devices, and external authentication providers are stubbed.
Future coverage could add isolated database/RLS tests and run
the mobile signup journey on a simulator or device.

## TDD example: malformed email domains

### Requirement

Shared signup and login validation must reject email addresses
with malformed dotted domains, such as `student@calpoly..edu`,
while preserving existing valid-email behavior.

### Red

A shared assertion was added to `validateSignup` for
`student@calpoly..edu`, plus a mobile login assertion for the
same address. Running `npm run test --workspace=packages/shared`
confirmed the shared test failed because validation previously
returned `null`.

### Green

The shared `isValidEmail` function was tightened so each
dot-separated domain label must be non-empty. This made the new
shared assertion pass and also applied the rule to mobile login
through the shared package.

### Refactor

The initial domain pattern was replaced with an explicit check
that:

- requires the basic email structure,
- splits the domain into labels, and
- requires at least two labels and no empty labels.
