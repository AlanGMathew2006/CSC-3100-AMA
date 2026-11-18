# iOS app phase 2 notes (issue #73)

Branch `sprint5/ios-core-screens`, stacked on `sprint5/expo-setup` (PR #79).
The core flow of the iPhone app now looks and works like the web app.

## Screens done

| Screen | Web source | Notes |
| --- | --- | --- |
| Welcome, Log in, Sign up | `WelcomePage`, `LoginPage`, `SignupPage` | Same layout, copy, error messages. No "Continue with Google" or "Forgot password?" (they need the deep links planned for phase 4). The "Terms of use" and "Privacy policy" links do nothing, as on the web. |
| Onboarding | `OnboardingPage` | Same fields, defaults, validation messages, allergen and avoided-food picker, preferred locations. Same calls: `POST /api/onboarding/complete`, then `PUT /api/preferences` for allergens and avoided foods. |
| Home (dashboard) | `DashboardPage`, `NutritionSheet` | Greeting card, Daily/Weekly toggle, Today's Nutrition ring, Nutrient Summary tiles (tap opens the nutrient sheet), Dining Dollars card, "What should I eat next?" with Macro Match and Add to Today, "Best options for you today", loading/error/empty states with the web text. Reloads whenever the tab or screen comes back into view, like the web page does when it opens. |
| Recommended meal | `RecommendationDetailPage` | Items ("in combo", "$8.49 each", ½ bases), combo price line, nutrition ("unavailable" for unknown values), Macro Match card, allergen card ("Allergen info incomplete", "Contains at least: ..."), Add to Today with the same toast and error behavior. |
| Profile | `ProfilePage` | All of it: balance and daily target, goals and dietary choices, allergen picker, budget alerts, theme, Save preferences, Log out. Nothing is left out of the web page. |
| Explore, Saved | `MenuPage`, `SavedMealsPage` | Tabs are in the bar; the screen shows the web page title and an empty-state card saying it comes in the next phase. |

Navigation is React Navigation (bottom tabs with the web's green bar, and a native stack inside Home). Phase 1 had no navigation library (just a `useState` for the auth screens), so I picked React Navigation over expo-router because the app is a plain Expo app with a custom entry point.

## Moved to `packages/shared` (web imports updated, web tests still pass)

- Formatting and text: `formatAmount`, `priceText`, `allergenLabel`, `errorMessage`, auth error messages (`authErrorMessage`, `isInvalidCredentials`; phase 1 had a copy in mobile, now deleted).
- Menu and recommendations: `listedLocation`, `servingLabel` and friends, `mealLog` helpers (`mealLogFromItem`, `comboLog`, `submitMealLog`, ...), the recommendation helpers (`recommendationLabel`, `recommendationLog`, `combinedAllergens`, `recommendationAsMenuItem`, empty-state texts, `lineNutrition`, `linePrice`), `cheapestOffering`/`mealPrice`, Macro Match labels and text.
- Dashboard logic that used to live inside `DashboardPage`: greeting, display name, calorie/macro numbers and text, Dining Dollars lines, weekly bars, recommendation card entries, and the `/api/dashboard` and `/api/recommendations` query builders.
- Form rules: onboarding and Profile validation and messages, default preferences, allergen and avoided-food list rules.
- API payload types (`DashboardData`, `MealLogInput`, `UserPreferences`, ...). `apps/web/src/types/dashboard.ts` re-exports them.
- Their tests moved with them (`node:test`) plus new ones for the dashboard, onboarding and line helpers.

## Fonts, colors and where they come from

- Fonts: DM Sans 400/500/700/800 and Inter 600, the same Google Fonts the web loads, bundled through `@expo-google-fonts` (no network fetch at launch). The web does not load DM Sans 600, so a CSS weight of 600 shows the 700 face there; mobile does the same.
- Colors, radii, spacing, shadows: copied from `apps/web/src/App.css` (final values after the cascade) into `apps/mobile/src/theme/tokens.ts`. Light and dark palettes; the dark one is the web's `html[data-theme="dark"]` overrides as one set of tokens.
- Icons: the web's Figma SVGs (`apps/web/public/assets/figma`), path data unchanged, drawn with react-native-svg in a color passed at render time (the web uses CSS filters).
- Images: the campus illustration and the two avatar pictures, copied to `apps/mobile/assets/images`.
- Dark mode: the web supports it on the dashboard, detail and Profile pages (theme preference), so mobile does too. It is applied when the preferences load and when you tap Light/Dark on Profile; signed-out screens and onboarding are always light (as on the web).

## What I checked visually

Expo web plus Playwright at 390x844, the web app and the mobile app side by side with the same stubbed API data (the fixtures from `apps/web/src/test/fixtures.ts`). Screens compared: Welcome, Log in, Sign up, onboarding (closed and open goals), dashboard daily and weekly (light and dark), recommended meal (light and dark), Profile (light and dark). The comparison found two real bugs (welcome image size, sign-up hint color); both are fixed.

I did not commit Expo web support: `react-dom` and `react-native-web` can't be added to `apps/mobile` without `expo-doctor` failing on duplicate React (the web app uses React 18), so I installed them with `npm install --no-save` for the check and removed them again. To repeat it: from `apps/mobile` run `npm install --no-save react-dom@19.3.0 react-native-web@^0.21.4 @expo/metro-runtime@~58.0.17`, copy `node_modules/react-native-web` from the repository root into `apps/mobile/node_modules` (npm hoists it to the root, where it would pick up React 18), then start `expo start --web` and the web app, and screenshot both. Run `npm install` afterwards to remove the extras.

### Remaining differences from the web

- The calorie ring: the web draws a gray disc and its blue arc is hidden behind it (so it never shows progress). Mobile draws the same disc plus a blue arc around the edge for the share of the calorie goal eaten. This is the one deliberate visual addition.
- The meal cards have no bookmark and the item cards in the recommended meal are not tappable (they open meal details on the web). Both come with Explore and Saved in phase 3.
- Budget alerts is a native iOS switch; the web shows a plain checkbox.
- No Google button or "Forgot password?" on Log in and Sign up.
- Text can be 1-3 points taller or wrap one word earlier than the web (React Native's line heights differ from the browser's). The web screenshots in my check fell back to a system font for some text because Google Fonts was blocked in the stubbed environment, so exact text widths could not be compared.
- The web's dark theme sets the "Poly" half of the logo to dark green on a near-black page, so it is hard to read. I matched it rather than fix it; it is a web bug worth a ticket.
- The native tab bar sits above the iPhone home indicator (its bottom padding follows the safe area), where the web has a fixed 14px.
- Dynamic Type: text scales with the system setting, capped at 1.4x (smaller caps on the tab labels, the ring and the summary tiles, which are 7-9 pt on the web). Long names wrap; tile values truncate with an ellipsis.

## Decisions I made

- A single-item recommendation opens the recommended meal screen too (the web opens the single meal's details, which belong to Explore). The screen works for any recommendation.
- The web fetches a limit of 4 recommendations on the dashboard (hero plus 3); mobile does the same, not the 3 from phase 1.
- Light/dark is applied from the saved preference like the web; there is no "follow the phone's setting" option because the web has none.
- `expo-doctor` failed with duplicate React after adding React Navigation: npm put its core package at the repository root, where it resolves the web app's React 18. I moved those packages (`@react-navigation/core`, `routers`, `use-latest-callback`, `use-sync-external-store`, `standard-navigation`, `react-freeze`, `sf-symbols-typescript`) under `apps/mobile` in `package-lock.json`. `npm ci` accepts it and doctor is 20/20. If a future `npm install` hoists them again, re-check `npx expo-doctor`.
- Font weights are imported from each `@expo-google-fonts/.../<weight>` folder because the package root pulls in a hook that needs `expo-font` from the repository root (not resolvable in Jest).
- Test data for the mobile screens is a copy of the web fixtures (`apps/mobile/src/test/fixtures.ts`).

## Left for phase 3 and later

- Explore (menu, search, filters, combos, meal and combo detail, quick add) and Saved (saved plans, recent choices, bookmark buttons on meal cards).
- Meal details reached from a recommendation item.
- Google sign-in, "Forgot password?", opening the confirmation link on the phone (deep links, phase 4).
- Privacy policy and Terms of use pages (no pages exist on the web yet).
- The notification bell does nothing, as on the web.

## How to test on your phone

Same setup as PR #79 (README, "Mobile app"): `.env` in `apps/mobile`, API running, `npm run mobile`, scan the QR code with Expo Go. Then:

1. Sign up (or log in). New accounts land on **Set Your Plan**: leave a balance or target empty and tap "See my recommendations" to see the error; fill both, open "Adjust daily nutrition targets", pick a priority, a diet, an allergen, type a food to avoid and tap Add, pick a location, then submit.
2. **Home**: check the greeting, switch Daily/Weekly, tap each Nutrient Summary tile (sheet opens; tap outside to close), look at Dining Dollars. Scroll to "What should I eat next?" and tap "Add to Today": you should see the "Meal added to today" toast and the numbers change.
3. Tap the meal card or "View Meal": check the items, the allergen text and Macro Match; tap "Add to Today" there (toast, then back to Home) or "Back".
4. **Explore** and **Saved**: both show the "coming in the next phase" card.
5. **Profile**: change the balance, a priority and an allergen, tap Save preferences ("Preferences saved."), go Home and check recommendations changed. Tap **Dark** to see dark mode, Save, then Log out and back in to check it persists. Turn on a large Dynamic Type size in iOS Settings and check nothing overflows.

## Checks run

`npm run build`, `npm run lint`, `npm test` (web 79, shared 108, backend 79), backend typecheck, `npm run typecheck:mobile`, `npm run lint:mobile`, `npm run test:mobile` (70 Jest tests), `npx expo-doctor` (20/20) and `npx expo export --platform ios` pass. Not run on a real iPhone by me: please do the walk-through above.
