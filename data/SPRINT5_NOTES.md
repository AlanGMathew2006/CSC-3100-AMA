# Sprint 5 notes

Four branches, local commits only (nothing pushed, no PRs or issues created):

| Branch | Based on | Work |
|---|---|---|
| `sprint5/auth-provider-refactor` (A) | main | #40 AuthProvider split |
| `sprint5/app-routing-refactor` (B) | A | #42 App routing refactor |
| `sprint5/expo-setup` (C) | main | iOS app (Expo), phase 1 |
| `sprint5/srd` (D) | main | SRD.md, plus this file |

This file is only committed on D (the other branches would each need the same
extra commit, and nothing here is needed by them).

## 1. Commits and ready-to-paste PRs

### A: `sprint5/auth-provider-refactor`

- `4ed7dc4` Add AuthProvider tests
- `93799d9` Split password recovery out of AuthProvider

**PR title:** Refactor AuthProvider: add tests, unwrap helper and split out password recovery

**PR description:**

Closes #40

- Adds characterization tests for AuthProvider first (26 tests: session load, auth state changes, email confirmation link, sign in, sign up with and without a session, Google, reset email, recovery state, update password, cancel recovery, sign out). They passed before the refactor (first commit).
- Adds `unwrap()` (`apps/web/src/lib/supabaseResult.ts`, with tests) that throws the Supabase error or returns data, and uses it in every auth method instead of the repeated `if (error) throw error`.
- Moves password recovery (`recovering`, `cancelPasswordRecovery`, `updatePassword`, recovery-link handling) into `PasswordRecoveryProvider` / `usePasswordRecovery` (`apps/web/src/passwordRecovery.tsx`). `useAuth()` keeps session, sign in, sign up, Google, reset email, email confirmation and sign out. The callers (App, ResetPasswordPage, main.tsx) are updated in the same commit.
- No behavior change. The recovery tests moved to the new hook with the same assertions, plus new ones (PASSWORD_RECOVERY event, other URLs left alone, hook used outside its provider).

### B: `sprint5/app-routing-refactor` (stacked on A: merge A first, then retarget B to main)

- `ee9e8e2` Add App routing tests
- `0938c19` Extract AuthScreens and LoadingShell from App

**PR title:** Refactor App routing: add tests, extract AuthScreens and LoadingShell

**PR description:**

Closes #42

Stacked on the AuthProvider refactor PR (#40): merge that one first, then retarget this PR to main.

- Adds App routing tests first (18 tests): config missing, email confirmation pending, loading, recovering (with and without a session), signed in (dashboard, onboarding, profile loading, profile error with Retry), signed out on welcome, log in and sign up and switching between them. They passed before the refactor (first commit).
- Extracts `<LoadingShell />` (used by App and SignedInApp) and `<AuthScreens />` (welcome, log in, sign up and the email-confirmed page; it owns the `screen` state).
- App is now: config check, email confirmation, loading, recovering, then `session ? <SignedInApp /> : <AuthScreens />`.
- No behavior change. Same tests pass. `npm run test:e2e` in apps/web also passes (6/6).

### C: `sprint5/expo-setup`

- `524cbc3` Move password validation and Profile type to packages/shared
- `7f9b76f` Add Expo iOS app in apps/mobile with Supabase auth and API client

**PR title:** Add Expo iOS app (phase 1: setup, auth, API client)

**PR description:**

Part of #<iOS issue number>

Phase 1 of the native iOS client in `apps/mobile` (Expo + React Native + TypeScript). The Vite web app is unchanged.

- New npm workspace `apps/mobile` from the Expo TypeScript template (Expo SDK 58, React 19.3, React Native 0.88). The web app keeps React 18; npm keeps the two copies apart, and the iOS bundle contains only React 19.
- Supabase auth with the session stored in AsyncStorage, auto refresh, and token refresh when the app comes to the foreground. Welcome, Log in and Sign up screens use the same password rules (now in `packages/shared`) and the same error messages as web. Email confirmation shows the same "check your email" message (deep links are phase 4; no Google sign-in yet).
- API client with the same pattern as the web one (Bearer token, one refresh-and-retry on 401, sign out on a second 401).
- Signed-in smoke screen: "Signed in as <email>", onboarding status, first 3 recommendations (name, price or "unavailable", calories, protein), Sign out, loading/error/empty states.
- `packages/shared` now has `validation.ts` (moved from the web app, web re-exports it) and the `Profile` type.
- Config from `apps/mobile/.env` (see `.env.example`). The README explains that the API URL must be the computer's LAN IP on a phone until the backend is deployed (#23).
- Root `npm run build`, `lint` and `test` stay on web, API and shared. Mobile has `npm run typecheck:mobile`, `lint:mobile`, `test:mobile` and a separate CI job.
- Checks: 33 Jest tests, typecheck, `expo lint`, `expo-doctor` (20/20) and `expo export --platform ios` all pass. Not run on a real phone or simulator yet.

### D: `sprint5/srd`

- `fb1e642` Fill in SRD traceability, endpoints, requirements and data
- (this notes file, committed after it)

**PR title:** Fill in SRD: traceability, endpoints, requirements, data and AI usage

**PR description:**

Part of #<SRD issue number>

- Traceability matrix: every TBD replaced with file paths and function/component names (frontend and backend) for US-01 to US-09.
- Section 5: all 20 routes in `backend.ts` as METHOD | URL | description, with which ones need sign-in; Mermaid diagram of the web client, iOS client, API, services and Supabase tables.
- Non-functional requirements: integrity, security (Supabase Auth, JWT check in the backend, RLS, environment variables, no bcrypt) and usability, written from what the code does.
- Data requirements: main tables and where each data file comes from.
- Section 8 (AI usage) filled in for Aarav Babel; other team members have a TODO line to fill in their own.
- Wireframes: still "See screenshots in the presentation".

## 2. What changed, and test counts

Baseline on main (c047cb8, after pulling 12 new commits): build, lint, tests and
typecheck all passed. Web 78, express-backend 79, shared 49.

| Branch | Web | Backend | Shared | Mobile |
|---|---|---|---|---|
| main (baseline) | 78 | 79 | 49 | none |
| A, after tests commit | 104 | 79 | 49 | none |
| A, after refactor | 112 | 79 | 49 | none |
| B, after tests commit | 130 | 79 | 49 | none |
| B, after refactor | 130 | 79 | 49 | none |
| C | 71 | 79 | 56 | 33 |
| D | 78 | 79 | 49 | none |

On C the 7 validation tests moved from web to shared (so web is 71 and shared
56); nothing was dropped.

What changed per branch:

- A: new `lib/supabaseResult.ts` (+test), `passwordRecovery.tsx` (+test), `auth.test.tsx`, `test/mockSupabase.ts` (shared fake client); `auth.tsx` slimmed; App.tsx, ResetPasswordPage.tsx and main.tsx updated for the new hook.
- B: new `components/LoadingShell.tsx`, `pages/auth/AuthScreens.tsx`, `App.test.tsx`; App.tsx now about 214 lines (was 253).
- C: `apps/mobile` (about 25 files), `packages/shared/src/validation.ts` + `Profile`, root scripts, CI job, README and CONTEXT.md.
- D: SRD.md only.

## 3. Decisions I made on my own

General

- Git identity is `aababel <113000924+aababel@users.noreply.github.com>`. The prompt said "Aarav Babel / aababel", so I treated `aababel` as me and committed with it, unchanged.
- `.claude/settings.local.json` already existed with only the attribution keys; I merged in `model: sonnet` and `effortLevel: medium`. It is git-ignored.
- `apps/web` has no lint script, so `npm run lint` only lints `packages/express-backend` (and now nothing from shared or mobile). I did not add a web linter.
- I used the issue text only as a guide. The code on main matched it: about six `if (error) throw error` blocks in auth.tsx, and App() was the chain of returns described. The 2026-11-16 theme change only touched Dashboard/Profile, not auth.tsx or App.tsx.

A (#40)

- `emailConfirmation.ts` and `recoveryLink.ts` have no module-level `let pending` globals on main (they are pure helpers), so I did not touch them. `main.tsx` still imports `./lib/recoveryLink` for side effects only as it did before.
- Recovery is a separate **provider** (`PasswordRecoveryProvider`, mounted around AuthProvider in main.tsx), not part of `useAuth()`. I updated every caller (App, ResetPasswordPage) in the same commit. It subscribes to `onAuthStateChange` itself for the PASSWORD_RECOVERY event; Supabase supports several listeners.
- Left in AuthProvider on purpose: `resetPassword` (it only sends the email), and the email-confirmation state (it is tied to the session sign-out logic).
- `unwrap()` is typed so callers get the success type of the Supabase response. It returns `undefined` for `signOut` (no data).
- CONTEXT.md did not describe the auth structure, so I did not change it for A.
- Tests use a shared fake client (`test/mockSupabase.ts`) loaded through `vi.mock` so both test files use the same mock.

B (#42)

- `AuthScreens` is in `pages/auth/AuthScreens.tsx` and also renders the email-confirmed page, as the prompt said.
- To keep behavior identical I kept two things in App: the confirmation page still shows before the loading check (it did before), and App remembers the last auth screen (`authStart`) so after a sign out, or "Back to log in" on an expired reset link, the user lands where they used to. Without that, AuthScreens would restart on Welcome. `AuthScreens` takes `initialScreen` and `onScreenChange` for this.
- The "Supabase isn't configured" block stays inline in App; it is one short block.
- App tests use the real auth pages and stub only DashboardPage and OnboardingPage (they have their own tests).
- Playwright's Chromium was not installed, so I ran `npx playwright install chromium` to run the e2e test. It passed.

C (iOS)

- Expo SDK 58 (the current template): React 19.3.0 and React Native 0.88.1. Mobile uses TypeScript ~6.0 (from the template); the rest of the repo is on 5.x.
- **Hoisting:** the Expo docs say duplicate React in one app breaks it and suggest aligning versions or `overrides`. I did not align (the web app must stay on React 18) and did not add `overrides`. With npm workspaces, npm nested React 19 and React Native under `apps/mobile/node_modules` and left React 18 at the root for web. I checked `npm ls react`, the web build and tests, and the iOS bundle (`--no-bytecode` output has only React 19.3.0). Metro needs no custom config (SDK 52+ handles monorepos). If a future mobile package hoists to the root and picks up React 18, run `npm ls react` and see CONTEXT.md.
- The template generated `apps/mobile/.claude/`, `AGENTS.md` and `LICENSE`. I deleted all three (nothing in `.claude/` may be committed).
- Added `types: ["jest"]` to the mobile tsconfig. `npx expo lint` created `eslint.config.js` (committed).
- The package is named `@csc-3100-ama/mobile`; the app name is "PolyProvision" and the slug `polyprovision` in app.json. I did not set an iOS bundle identifier (not needed for Expo Go).
- Navigation is a small state switch (Welcome / Log in / Sign up), no navigation library yet. Phase 2 should pick one (Expo Router is the template's direction).
- Session storage is AsyncStorage (the allowed first option). SecureStore with a chunking adapter is a later hardening step.
- Validation: moved `validation.ts` to `packages/shared` (clean move; the web file is now a re-export so no web imports changed). I also moved the `Profile` type there. `authErrors.ts` is web-only, so I copied it to mobile with a comment to keep the messages in sync.
- Mobile login checks only the email format and an empty password before calling Supabase (web leaves that to the server).
- The mobile signed-in screen lists up to 3 recommendations: `GET /api/recommendations?limit=3`. The price shown is the recommendation's `total_price`.
- The mobile sign-up does not pass `emailRedirectTo` (deep links are phase 4), so the confirmation email uses the Supabase project's default Site URL.
- Root `test` and `lint` now list web, shared and express-backend explicitly instead of `--workspaces`, so mobile cannot break web CI. Added root scripts `mobile`, `typecheck:mobile`, `lint:mobile`, `test:mobile` and a separate `mobile` job in the GitHub workflow.
- The Dockerfiles copy only some `package.json` files before `npm ci`. I checked that `npm ci` still works without `apps/mobile/package.json`, so I left the Dockerfiles alone (Docker itself was not started, so the images are not rebuilt).
- Expo's `expo install` crashed once while adding the test libraries (after adding the Expo-managed ones), so I installed `react-test-renderer@19.3.0` and `@testing-library/react-native` with npm.
- `@testing-library/react-native` 14 is async, so mobile tests use `await render(...)` and `await fireEvent...`.

D (SRD)

- Kept all existing headings, including the odd numbering (two sections 5, 6 and 7 mixed up with the table of contents) and the TOC line "Database schema (MySQL)". The database is PostgreSQL (Supabase); the data section says so. You may want to fix that heading yourself.
- Traceability uses names, not line numbers. The column title is still "LINE OF CODE".
- I added a row to the document history (2026-11-17, Aarav Babel).
- US-08: the web UI offers dietary restrictions (vegetarian, vegan, halal-friendly, gluten-free, no seafood) in onboarding and profile. The `allergens` and `excluded_foods` fields exist in the API and are enforced by the optimizer, but I did not find a screen to edit them; the SRD only describes what the code does.
- US-05: the web Explore tab filters by location; the dashboard recommendations use `limit` only. The API also supports `location_id`.
- Section 8 uses only the facts from the prompt. "Other team members: TODO" appears twice (once under models, once under prompts).
- Wireframes: the repo images are icons and photos, not wireframes, so the heading says "See screenshots in the presentation."
- Security text says what the code shows: no rate limiting or other hardening is claimed.

## 4. Manual steps for you

Try the iOS app on your iPhone (Expo Go)

1. Install **Expo Go** from the App Store. Put the iPhone and the computer on the same Wi-Fi.
2. `git checkout sprint5/expo-setup && npm install`
3. `cp apps/mobile/.env.example apps/mobile/.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`: the same values as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local`.
   - `EXPO_PUBLIC_API_URL=http://<your LAN IP>:8000`. Not localhost: on the phone, localhost is the phone. Get the IP with `ipconfig getifaddr en0`.
4. Terminal 1: `npm run dev --workspace=packages/express-backend` (needs `packages/express-backend/.env`). Allow incoming connections on port 8000 if macOS asks.
5. Terminal 2: `npm run build --workspace=packages/shared`, then `npm run mobile`. Scan the QR code with the iPhone camera and open it in Expo Go. After editing `.env`, restart with `npx expo start --clear` from `apps/mobile`.
6. Try: sign up (a short password should be refused with the web message), log in, check the signed-in screen (email, onboarding done?, 3 recommendations), sign out, and kill and reopen the app (you should stay signed in).

Other

- Read SRD section 8 before the PR, and ask the teammates to fill their own "Other team members" lines. Also check the "Frontend/Backend" cells in the matrix; they are from the code, not from running it.
- Merge order: A, then B (retarget to main). C and D can go in any order. C is the only branch that changes `package.json`, `package-lock.json`, `packages/shared`, `apps/web/src/lib/validation.ts` and `apps/web/src/types/dashboard.ts`; A and B change other web files, so there should be no conflicts.
- Fill in the issue numbers in the PR text for C and D.
- Supabase: if you want the sign-up confirmation email on the phone to open something sensible, check the project's Site URL (phase 4 adds deep links).
- Nothing was pushed. Run `git push` for each branch yourself when you are ready.

## 5. WIP, failing and not verified

- No branch is WIP; every commit passed `npm run build`, `npm run lint`, `npm test` and `npm run typecheck --workspace=packages/express-backend` (and the mobile checks on C).
- **Not verified:** the app on a real iPhone or in the simulator (only Jest, typecheck, lint, expo-doctor and an iOS bundle export). The Supabase session persistence, foreground token refresh, and talking to the real API over the LAN are untested.
- **Not verified:** the new `mobile` job in GitHub Actions (the commands pass locally). The existing job still runs `npm ci`, which now also installs the Expo packages (slower).
- **Not verified:** Docker builds (daemon not started); only `npm ci` was simulated.
- `npm install` reports many audit warnings (mostly in Expo/React Native tooling). I did not run `npm audit fix`.
- Web `test:e2e` was run on B only (passed). C and D do not touch the web UI.

## 6. Phase 2 of the iOS app should start with

1. Pick the navigation (Expo Router or React Navigation) and add a bottom tab bar that matches the web one (green background, white inactive icons, gold active icon).
2. Onboarding screens (the smoke screen currently tells the user to finish onboarding on the web), then Dashboard, Explore (menu, Open now, location filter), and recommendation detail.
3. Grow the API client (`apps/mobile/src/lib/apiClient.ts`) to the other endpoints, and move the shared bits (`authErrors.ts`, `format.ts`, request types from `apps/web/src/types/dashboard.ts`) into `packages/shared` so web and mobile do not drift.
4. Real styling/theme and dark mode, and decide on SecureStore for the session.
5. Test on a real device first (see section 4), and fix whatever that shows.
