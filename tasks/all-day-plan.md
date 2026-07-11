# Vinho all-day build plan

Goal (from the user): comprehensive test coverage (unit, integration, pgTAP, e2e); a serious CI/CD pipeline that deploys web, migrations, and edge functions; serious iOS and Android App Store / Play Store deployment pipelines; bring the Android app to functional parity with iOS; then finish the remaining tech-debt audit items. Reference implementation: `../../SaaS-apps/futurenerds`.

Status legend: [ ] open, [~] in progress, [x] done, [-] accepted/skip.

## Phase 0 — Environment (this session)

- [x] Local Supabase up on Postgres 17 (stopped the concurrent futurenerds/meetups stacks for the port conflict — data preserved; excluded storage-api whose image pull stalls on this loaded Docker).
- [x] **Migrations verified applying cleanly on PG17** — via direct psql (all 8 apply, history recorded). Documented root cause: the supabase CLI's `db reset`/`start` hang locally (pg_cron/pg_net/realtime hold connections that block DROP DATABASE; CLI hangs at "Initialising schema"). The SQL is fine — this is a local CLI/Docker env issue; CI on a clean runner is unaffected. Local-only drift: the wine-images bucket insert needs storage-api's storage schema (the pgTAP suite guards for this).
- [ ] Regenerate `apps/vinho-web/lib/database.types.ts` — deferred to the CI type-drift gate (CLI `gen types` may hit the same local hang).

## Phase 1 — Test coverage

Reference patterns (futurenerds): jest (unit + component + integration split), pgTAP under `supabase/tests/*.sql` run via `supabase test db`, Playwright e2e under `web/e2e/` with `playwright.config.ts`.

### 1a. pgTAP database tests (`supabase/tests/`) — DONE ✅
- [x] Wrote 7 suites (00_smoke, 01_rls_enabled, 02_rls_write_scope, 03_storage_policies, 04_security_definer_functions, 05_queue_and_constraints, 06_repair_function). **All 39 assertions pass** against the live migrated schema (run via psql+pgtap; `supabase test db` is the CI runner). Caught and fixed 3 real assertion bugs (anon-grants model, search_path quoting, storage-schema guard).
- [ ] (superseded) original scaffold checklist:
  - `00_smoke` — pgTAP installed, core tables exist.
  - `01_rls_enabled` — every public table has RLS on (scans, tastings, wines, wines_added_queue, wines_enrichment_queue, sharing_connections, user_sharing_preferences, profiles, photos, etc.).
  - `02_rls_write_scope` — user isolation: a user can only see/insert/update/delete their own scans/tastings/queue rows; anon blocked.
  - `03_storage_policies` — scans/avatars/wine-images buckets: owner-folder SELECT scoping (the DB-1 fix), authenticated INSERT.
  - `04_security_definer_functions` — the locked-down functions (DB-2) reject anon; get_invite_by_code still allows anon.
  - `05_queue_claim_atomicity` — claim RPCs mark rows `processing`, `FOR UPDATE SKIP LOCKED`, retry cap.
  - `06_repair_orphaned_scans` — inserting a storage object with no scan row → repair enqueues it once (idempotency key).
  - `07_triggers_constraints` — status check constraints, retry_count <= 3, foreign keys, updated_at coverage.
  - `08_cron_jobs_present` — the 7 cron jobs exist with expected schedules (guard on pg_cron).
- [ ] Wire `supabase test db` into the integration CI job.

### 1b. Web unit tests (jest) — DONE ✅
- [x] The default `pnpm --filter vinho-web test` is fully GREEN: **19 suites / 208 tests, 0 failing** (was 10 failed suites / 47 failed tests when this pass started). Fixed via a subagent + my gating: (1) moved the 5 live-DB suites (integration/e2e/queue/wine-processing/varietals) behind `RUN_INTEGRATION=1` centrally in `jest.config.js`; (2) fixed the 10 mock-based suites — root causes were `import { jest } from "@jest/globals"` silently breaking SWC `jest.mock` hoisting (4 suites), incomplete/throwaway supabase query-builder mocks, components mocking `@supabase/ssr` instead of `@/lib/supabase`, real `setTimeout` backoff needing fake timers, and stale post-refactor assertions. No production source changed. The `no-mock-data` integrity scan was rescoped to web production source (was reaching into iOS previews + dev scripts).

### 1c. Integration tests (jest + live local Supabase) — DONE ✅
- [x] Live-network suites are cleanly split out of the default `test` run: `jest.config.js` ignores `integration/e2e/queue/wine-processing/varietals` unless `RUN_INTEGRATION=1`, and `test:integration` sets that flag + targets exactly those paths. They run in the `integration-and-pgtap` CI job (`supabase start` → `db reset` → `test:integration`). Unit CI stays green without a DB. (Local run remains blocked by the documented Supabase CLI hang; CI runners are clean.)

### 1d. e2e (Playwright) — DONE ✅ (artifacts + CI; local run needs Supabase)
- [x] Added `apps/vinho-web/playwright.config.ts` (setup/chromium/unauthenticated projects, `webServer: pnpm dev`, storage-state reuse), `e2e/auth/auth.setup.ts` (signs in the seeded test user → `/journal`, saves state), and specs: `auth/login.unauth.spec.ts` (form render, invalid-creds, protected-route redirect), `journal.spec.ts` (journal/map/scan/profile shell), `sharing.spec.ts` (sharing surface + invite field). Targets Vinho's real routes. `e2e/README.md` documents the run steps + the local Supabase requirement.
- [x] Added `test:e2e`/`test:e2e:ui` scripts; made jest ignore the root `e2e/` dir and tsconfig exclude it + `playwright.config.ts` (so `@playwright/test` being uninstalled doesn't break jest/tsc — both verified green). `@playwright/test` intentionally kept out of the committed lockfile (frozen-lockfile jobs stay lean); the e2e CI job installs it ephemerally (pinned 1.49.1).
- [x] Added the `e2e` CI job to `ci.yml`: starts local Supabase, `db reset` (seeds the test user), captures the local API URL/anon key, installs Chromium, runs the suite, uploads the Playwright report on failure. YAML validated.

### 1e. Jest environment
- [x] Custom jsdom environment injecting Node web globals (done earlier — WT-0). Verify it stays.

## Phase 2 — CI/CD (web + migrations + edge functions)

Model on futurenerds `pr-check.yml` + `production.yml` (patterns I already partly adopted in `deploy.yml`).

- [x] Rewrote `.github/workflows/ci.yml` (PR check): jobs lint-and-typecheck (+`pnpm audit --audit-level=high`), test (jest unit), validate-migrations (supabase start → db reset → **committed database.types.ts drift gate**), integration-and-pgtap (`supabase test db` + `test:integration`), build. SHA-pinned pnpm/action-setup + supabase/setup-cli, pinned CLI 2.109.0, `permissions: contents: read`, concurrency cancel. YAML validated; scripts confirmed present (`supa:types` is a root script). **Playwright `e2e` job now added** (Phase 1d).
- [x] Hardened `.github/workflows/deploy.yml`: added `permissions: contents: read`, SHA-pinned `supabase/setup-cli`. (Detect-changes full-range diff, shared-path detection, deleted-function skip, pinned CLI were done earlier.)
- [x] Decision: **web deploys via Vercel's Git integration** (confirmed — vinho project `prj_GeLlRSeRZNaa2JJ7aJgtbDbvYLU6` already auto-deploys from main; the reference does the same and has NO web-deploy workflow). No web deploy job needed; the CI `build` job is the gate.
- [x] Documented every required secret + the full pipeline in `docs/CI-CD.md` (web build/deploy GitHub secrets, mobile signing secrets, local run commands, the iOS xcodegen note).
- [ ] Optional (not done — nice-to-have): a local `scripts/verify.sh` gate mirroring the reference (tsc, eslint, unit, build, schema-drift, integration, pgTAP) for pre-push confidence. Low value now that CI covers all of these; left for the user if they want a one-command local gate.

## Phase 3 — Mobile deployment pipelines

Reference approach (confirmed): mobile ships from the CLI via portable scripts, not GitHub Actions, with Doppler as the secret source. Port those scripts to vinho (same Strategic Nerds ASC team `955GSY56UT`; vinho already has the ASC secrets: ASC_KEY_ID/ISSUER_ID/APP_ID + AuthKey_AY25H65TAY.p8). I'll port the scripts AND add thin optional GitHub workflows that invoke them (workflow_dispatch/tag) so the user has both a local and a CI path — the user asked for "a serious pipeline," and CI triggers on top of the proven scripts is the strongest form.

### 3a. iOS — port `scripts/ship.py` + `ship_lib/` from futurenerds — DONE ✅
- [x] Copied ship.py + ship_lib/* (asc, commands, config, exportplist, log, secrets, version, xcode) + requirements.txt into `scripts/`. version.py already supports xcodegen `.yml`, so no adaptation needed.
- [x] Wrote `scripts/ship.toml` for vinho (name Vinho, bundle com.strategicnerds.vinho, team 955GSY56UT, scheme Vinho, ios_root apps/vinho-ios, `project_yml = project.yml`, doppler vinho/prd).
- [x] **`ship.py info` + `ship.py verify` both pass end-to-end**: tools present (xcodebuild/xcrun/xcodegen), version read (1.0.1/build 2) from project.yml, ASC secrets pulled from Doppler (vinho/prd), ASC key found at `~/.private_keys/AuthKey_D592A82U3D.p8`, and **ASC auth succeeds (5 apps visible)**. Commands available: simulator/testflight/app-store/bump/verify/info. An actual TestFlight/App Store upload is user-gated (deliberate, mutating).
- [ ] Add optional `.github/workflows/ios-release.yml` (workflow_dispatch + `ios-v*` tag) running `ship.py testflight`/`app-store` on a macOS runner with ASC secrets.

### 3b. Android — port `scripts/release-android.sh` + Gradle Play Publisher
- [x] Wrote `scripts/release-android.sh` (adapted: appId com.strategicnerds.vinho, ANDROID_DIR apps/vinho-android; track arg, versionCode bump, DRAFT upload) and `scripts/sync-android-config.sh` (pulls BuildConfig secrets + release keystore + Play SA JSON from Doppler `vinho` project). Both pass `bash -n`.
- [x] Added Triple-T Play Publisher (`com.github.triplet.play` 3.12.1) + `play { track="internal"; releaseStatus=DRAFT; defaultToAppBundles=true }` + conditional `signingConfigs.release` (from local.properties, present-only) to `apps/vinho-android/app/build.gradle.kts`. This also closes Android release-readiness P4-11 (Android had NO release signing). Gitignored the SA JSON + keystore.
- [x] **Verified: `./gradlew :app:tasks --group=Publishing` → BUILD SUCCESSFUL**, plugin resolved, `publishReleaseBundle` + the full Triple-T task set present. Actual Play upload is user-gated (needs Doppler Android secrets + a Play service account, which don't exist yet — the app was never release-ready).
- [ ] Add optional `.github/workflows/android-release.yml` (workflow_dispatch + `android-v*` tag).

## Phase 4 — Android parity with iOS

Good news: the Android core loop already works (email + OAuth auth, tasting list/search/stats, scan→queue→edit, tasting map, profile edit). The gaps are mostly wiring, a few broken paths, and missing screens. Android is `com.strategicnerds.vinho`, Compose + Material3 + Hilt, Supabase Kotlin SDK 3.0.3, minSdk 26/target 35. It has NO NavHost (manual `when`-routing + bottom-sheet flags), no unit tests, one non-compiling instrumentation test, and no release signing.

### Parity matrix (iOS feature → Android status → action)

| Feature | iOS | Android | Action |
|---|---|---|---|
| Auth: email, Google, Apple, reset | ✅ | ✅ works | none |
| Journal list + search + time filters + pagination + stats | ✅ | ✅ works | verify parity of filters |
| Scan → storage → queue → edge invoke → status | ✅ (realtime) | ✅ works (polling) | [x] P4-1 (partial): set scan upload `upsert=false` (was true) to match iOS/web. Full dedup of `ScanRepository.uploadScan` vs the inline `ScannerViewModel.uploadScan` deferred (both work; low risk). |
| Tasting create/edit (3 profile styles) + location autocomplete | ✅ | ✅ works | [x] P4-2 (verified): Android already implements all three styles — `TastingStyle.CASUAL/SOMMELIER/WINEMAKER` (TastingEditorViewModel) with dedicated `CasualTastingForm`/`SommelierTastingForm`/`WinemakerTastingForm` + a segmented style selector in TastingEditorScreen, matching iOS's casual/sommelier/winemaker. No gap. |
| Tasting detail: inline rating/notes/date/location auto-save, expert rating | ✅ | ✅ works | verify field parity |
| Wine catalog list + detail (tabs: details/tastings/pairings, AI Fill) | ✅ | ⚠️→✅ **reachable** (P4-3 done) | [x] P4-3: wired WineDetailScreen as a sheet from the recommendations "You might like" tap (HomeScreen.kt) — the built-but-unreachable detail is now reachable; onTasting/onAddTasting route to the existing tasting sheets. (Full WineListScreen catalog tab + a NavHost is a larger P4-10 refactor, deferred — see below.) |
| Recommendations ("You might like") | ✅ | ⚠️→✅ (P4-4 done) | [x] P4-4: removed the placeholder `sha256/AAAA...` cert pins (empty pinner = standard system-trust TLS, still secure), so recommendations requests no longer fail with SSLPeerUnverifiedException. Documented how to add real SPKI pins later. Removed dead `developmentPinner`. |
| Map: tasting locations | ✅ | ✅ works | none |
| Map: wine origins / "Regions" mode | ✅ | ⚠️→✅ (P4-5 done) | [x] P4-5: made the "Regions" toggle functional — it now plots each wine at its producer origin (`vintage.wine.producer.latitude/longitude`, label from `producer.region.name, country`), mirroring iOS "Wine Origins". Tastings mode unchanged. Also wired `onTastingClick` from HomeScreen so map marker taps open the tasting detail (was a no-op default). Build-verified. NEEDS EMULATOR RUNTIME VALIDATION (marker rendering + producer coords depend on enriched data). |
| Sharing (invite / accept / revoke / visibility toggles) | ✅ full UI | ❌→✅ (P4-6 done) | [x] P4-6: built full sharing stack — `data/model/Sharing.kt` (SharingConnection/SharingProfile/UserSharingPreferences), `data/repository/SharingRepository.kt` (get_sharing_connections_with_profiles RPC, send-sharing-invitation edge fn with `viewer_email`, accept/reject/revoke via `sharing_connections` status update matching iOS, visibility via `user_sharing_preferences.visible_sharers`), `ui/state/SharingViewModel.kt`, `ui/screens/sharing/SharingScreen.kt`. Wired reachable via the existing Profile → "Sharing" settings row. Build-verified (assembleDebug green). NEEDS EMULATOR RUNTIME VALIDATION. |
| Profile avatar upload | stubbed both | ⚠️→✅ (P4-7 done) | [x] P4-7: avatar upload now targets the real `avatars` bucket (was the nonexistent `profile-images`) with an owner-folder path (`<userId>/...`) matching the storage RLS policy. |
| Profile settings sub-screens (personal info, privacy, prefs, notifications, appearance, about) | ✅ (many local-only) | partial→✅ functional-parity (P4-8 done) | [x] P4-8: closed the one functional gap — the "Notifications" settings row was a dead `onClick = {}`. Built a `NotificationsScreen` + `NotificationsViewModel` backed by six DataStore toggles in `UserPreferences` (push/email/tastingReminders/newWineAlerts/priceAlerts/events), exactly mirroring iOS's `@AppStorage` NotificationsView (device-local, no backend). Wired reachable from the Profile → Notifications row. Personal-info parity already met (ProfileEditScreen persists first/last/bio; iOS adds only phone, a cosmetic local field). Remaining iOS sub-screens (Privacy/Appearance/About) are static/local-only text surfaces — deferred as cosmetic, not functionality (same rationale as P4-10 NavHost). Build-verified. |
| Wine preferences (types/regions/varietals/styles/price/note-style) → profiles | ✅ | ✅ (ProfileEdit) | verify the preference fields match |
| Biometric app lock | ✅ (bound to key; see audit IOS-4) | ⚠️→✅ (P4-9 done) | [x] P4-9: made it functional. `VinhoActivity` now extends `FragmentActivity` (BiometricPrompt requires it), injects `BiometricLockController`, re-locks in `onStop()` (`lockIfEnabled()`), and prompts in `onStart()` when locked. Added a full-screen `BiometricLockOverlay` (observes `isLocked`, auto-prompts on lock, manual "Unlock" retry). Controller gained an `enabled` flag (synced from `SessionViewModel.observePreferences`), `lockIfEnabled()`, an in-flight prompt guard, and `onAuthenticationError` handling (stays locked). Build-verified. NEEDS EMULATOR/DEVICE RUNTIME VALIDATION (biometric hardware). |
| Account deletion | ✅ | ✅ (POST /api/account/delete) | none |
| Navigation framework | native | ❌ no NavHost | P4-10: introduce Compose Navigation (NavHost + back stack) so the catalog/sharing/settings screens are reachable and state restores |
| Feed / social | placeholder (iOS FeedView is static) | unused `FeedItem` model, no screen | defer both — iOS feed is itself static placeholder; not real parity work |

### Android release-readiness (needed for Phase 3 Android pipeline)
- P4-11: add a release `signingConfig` + keystore wiring (currently none), enable R8/minify for release, populate the empty `gradle/libs.versions.toml` version catalog.
- [x] P4-12: fixed the broken instrumentation test — moved `VinhoAppTest.kt` from the wrong package `com.vinho.android` to `com.strategicnerds.vinho` and corrected the `SplashScreen`/`VinhoTheme` imports (asserts the real "Loading your cellar..." copy; runs on a device/CI). Added the first JVM unit tests (`src/test` did not exist): `SharingLogicTest` (7 tests — displayName join/fallback, connection status flags, pendingReceived/activeSharesSent/activeSharesReceived filters, isSharerVisible) and `NotificationPreferencesTest` (defaults match iOS). **8 tests pass, 0 skipped** (`./gradlew :app:testDebugUnitTest`). Factory-function test-data pattern per repo testing rules. |

### Verify-as-you-go
Android changes need a Gradle build (`./gradlew :app:assembleDebug`) and ideally an emulator. Where an emulator isn't available, compile-verify and defer runtime checks with a note. Confirmed backend facts: prod buckets are avatars/scans/wine-images/wine-labels (no profile-images); RPCs get_tastings_with_sharing/search_tastings_text exist; edge fns process-wine-queue/fetch-expert-rating exist.

## Phase 5 — Remaining tech-debt audit items

- [x] Safe, high-value, compile-verified iOS fixes done this pass (Xcode 26.6 available):
  - IOS-4: biometric toggle now binds to the key the service actually reads (`biometric_auth_enabled`) — the security toggle previously controlled nothing.
  - IOS-5: `TastingService.createTasting` guards the vintage UUID and fails instead of fabricating a random one (was silently orphaning tastings).
  - IOS-8: deleted the abandoned second `@main` TCA rewrite (`vinho-ios/VinhoApp.swift`).
  - IOS-9: deleted the dead `CertificatePinningDelegate` (empty pins, unconditional trust, unreferenced).
  - **IOS-BUILD (significant discovery):** the iOS app did not build via `xcodegen` — `project.yml` had drifted from the curated committed pbxproj and globs in an abandoned `Components/Common/` extraction that redeclares built types. Confirmed the committed pbxproj builds (`BUILD SUCCEEDED`); repointed the deploy (`scripts/ship.toml`) off the stale `project.yml` onto the pbxproj so ship builds and version-bumps the working project. Full reconciliation flagged as a supervised follow-up in the audit.
- [ ] Deferred (SUPERVISED — the audit itself dispositioned these as large refactors in untested code better done with a human in the loop, not blind in an unattended run): the web file-splits (WC-1/2/13, WA-6, SB-6), edge-function error-handling passes (SB-8/13/14/20), the iOS service/error-handling refactors (IOS-6/7/10–18), the ARCH-1 scan-pipeline consolidation, and the production Supabase dashboard settings (DB-4/5/6/10). IOS-19 (placeholder App Store id) can't be resolved until the app has a real listing.

## Phase 6 — Store listing readiness (requested by the user)

The user will set up the Play Store with my help; they also want screenshots and icons generated/verified. Deliver:

### 6a. Play Store configuration guide
- [ ] Write `apps/vinho-android/PLAY-STORE-SUBMIT-PROCESS.md` (mirror the existing iOS `APP-STORE-SUBMIT-PROCESS.md`): Play Console app creation (package `com.strategicnerds.vinho`), the closed-testing → production gate, content rating questionnaire, Data Safety form (what vinho collects: email, photos, location, wine data → Supabase; PostHog analytics), privacy policy URL (vinho.dev/privacy), pricing (free), and the **publisher API service account** setup (create in Google Cloud, grant Play Console access, download JSON → `ANDROID_PLAY_SA_JSON` in Doppler). Plus the release keystore generation (`keytool`) → base64 → Doppler (`ANDROID_RELEASE_KEYSTORE_BASE64` + passwords), which `sync-android-config.sh`/`release-android.sh` consume. End state: `./scripts/release-android.sh internal` uploads a draft.
- [ ] Document the exact Doppler keys the Android pipeline needs (SUPABASE_URL, SUPABASE_ANON_KEY, MAPS_API_KEY, POSTHOG_*, and the release/Play keys above).

### 6b. Icons
- [x] Verified Android launcher icons: adaptive `ic_launcher`/`ic_launcher_round` (mipmap-anydpi-v26) with vector foreground + `#722F37` background. minSdk 26 ⇒ adaptive-only is sufficient (no legacy PNG mipmaps needed). On-brand, complete.
- [x] Generated Play Store listing graphics from `apps/vinho-web/public/icon-512.png` into `apps/vinho-android/store-assets/`: `play-store-icon-512.png` (512×512, opaque, flattened onto brand burgundy) and `feature-graphic-1024x500.png` (1024×500, burgundy gradient + "Vinho" wordmark + "Your wine tasting journal" tagline, Georgia). Provenance + regen commands in `store-assets/README.md`.

### 6c. Screenshots
- [x] Booted the `Medium_Phone_API_36.1` emulator, installed the debug APK (`com.strategicnerds.vinho.debug`), and confirmed the app **launches with no crash** — `VinhoActivity` (the new FragmentActivity from P4-9) is the top resumed activity. This is a real runtime smoke test of the Phase 4 changes. Captured a store-ready login screenshot: `store-assets/phone/00-launch-unauthenticated.png` (1080×2400). Also validated the auth flow end-to-end (correct "Invalid login credentials" error + network path to prod Supabase).
- [ ] **Authenticated screenshots (journal/wine-detail/map/scanner/sharing) are blocked on the user's real credentials** — the debug build targets production Supabase and the seeded `test@vinho.app` is local-only (confirmed rejected against prod). Full capture recipe (adb + demo-mode status bar) is in `store-assets/README.md`; the user runs it after signing in. Also fixed a store-readiness copy leak: the auth tagline "A modern wine journal backed by Supabase." → "Your journal for every wine worth remembering." (don't expose the tech stack to end users).
- [ ] If an emulator/simulator isn't available in this environment, produce the capture recipe (which screens, adb/simctl commands, required resolutions) so the user runs it.

## Current environment state (for the loop)

- Local Supabase DB is UP (Postgres 17, storage-api excluded) with the full schema applied via psql + migration history recorded. pgtap extension installed. This DB is usable for pgTAP and integration tests NOW, but is flaky (CLI start/reset hang; may need psql re-apply if Docker churns). `storage-api:custom-metadata` image was still pulling in the background (task b1nl0smn1).
- The supabase CLI's `start`/`db reset`/`gen types`/`test db` all risk hanging locally (pg_cron/pg_net connection race + "Initialising schema" hang). Prefer direct psql for DB ops; these commands work fine on clean CI runners.

## Reprioritized execution order (given local-stack flakiness)

Do the high-value work that does NOT depend on the flaky local stack first, interleaving DB-dependent test verification when the stack cooperates:
1. **Phase 2 CI/CD** (pure YAML — unblocked). Wire in the pgTAP suite (`supabase test db`), unit/integration/build/type-drift jobs. The pgTAP + CI is where the DB tests actually get verified on a clean runner.
2. **Phase 3 mobile deploy scripts** (port ship.py + release-android.sh — unblocked).
3. **Phase 4 Android parity** (Kotlin/Gradle — needs Android SDK, not local Supabase).
4. **Phase 6 Store readiness** — 6a Play Store guide + 6b icons now (no emulator needed); 6c screenshots after Phase 4 (needs emulator, else produce the capture recipe for the user).
5. **Phase 1c/1d** integration + Playwright e2e — verify against the live local DB opportunistically.
6. **Phase 5** remaining audit items.

The user explicitly asked (this session): when done, give them the Play Store configuration walkthrough (6a), and generate/verify screenshots (6c) and icons (6b). Treat 6a/6b as required deliverables; produce a screenshot capture recipe if no emulator.

## Execution

Run as a self-paced `/loop`. Each iteration: pick the next unchecked item top-down, implement, verify with the project's own checks (pnpm test/lint/build, `supabase db reset`, `supabase test db`, Playwright), tick it off with a one-line note. Do not commit or push. Prefer real verification over assumption; defer only what genuinely needs a device/simulator or a human decision, with a reason.
