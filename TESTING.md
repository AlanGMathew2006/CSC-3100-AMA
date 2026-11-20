# Testing

## System-test scope

This repository currently includes two backend system tests in
`packages/express-backend/services/system.test.ts`.

- `GET /api/menu` exercises HTTP routing, the menu service, and the
  data-access abstraction.
- `POST /api/meal-logs` exercises HTTP routing and authentication injection,
  request validation, the user service, and the insert data-access abstraction.

The system tests use Node's built-in `node:test` runner and Node's built-in
`fetch` API. Authentication and the Supabase data-access layer are replaced
with deterministic test doubles, so the tests do not require network access or
a real test database.

## Install and run

From the repository root:

```powershell
npm install
npm run test:system
```

The dedicated command runs only the two system tests:

```text
packages/express-backend/services/system.test.ts
```

To run the complete configured test suite (including existing unit and UI
tests where applicable):

```powershell
npm test
```

To run the backend tests directly:

```powershell
npm run test --workspace=packages/express-backend
npm run test:system --workspace=packages/express-backend
```

## Requirements

- Node.js and npm
- Repository dependencies installed with `npm install`

No Supabase environment variables are needed for the system tests because the
test authentication and database calls are injected. The normal application
requires the environment setup described in `README.md`.

## Known limitations

The current system tests use mocked data-access responses; they verify
integration between Express and backend logic but do not exercise a live
Supabase database or RLS policies. The tests do not start the real backend
listener; they start a temporary HTTP server on an available local port.

## TDD example: malformed email domains

### Requirement

Shared signup and login validation must reject email addresses with malformed
dotted domains, such as `student@calpoly..edu`, while preserving existing
valid-email behavior.

### Red

A shared assertion was added to `validateSignup` for
`student@calpoly..edu`, plus a mobile login assertion for the same address.
Running `npm run test --workspace=packages/shared` confirmed the shared test
failed because validation previously returned `null`.

### Green

The shared `isValidEmail` function was tightened so each dot-separated domain
label must be non-empty. This made the new shared assertion pass and also
applied the rule to mobile login through the shared package.

### Refactor

The initial domain pattern was replaced with an explicit check that:

- requires the basic email structure,
- splits the domain into labels, and
- requires at least two labels and no empty labels.
