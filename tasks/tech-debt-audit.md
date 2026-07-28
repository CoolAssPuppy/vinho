# Tech debt audit

Date: 2026-07-11. Scope: web, iOS, Android, Supabase backend, CI/CD, production database.
Status legend: [ ] open, [x] fixed, [-] accepted/won't fix.

## 2026-07-28 session (disk IO incident + verification pass)

**This file was stale.** Several items marked open had already been fixed in code but never checked off. Verified against the actual tree, not the checkboxes:

- AND-2 (Android cert pinning): already fixed. `CertificatePinnerConfig` now builds an empty `CertificatePinner` with a comment explaining the fallback to system trust and how to compute real pins. Not open.
- AND-4 (`upsert = true` on scan upload): already fixed to `upsert = false` with a comment noting it matches iOS/web. Not open.
- AND-11 (hardcoded `www.vinho.dev`): deliberate, documented in code ("redirects from vinho.dev strip auth headers"). Reclassify as accepted, not debt.
- Web test suite: **19 suites / 208 tests, all passing.** The WT-0 note describing 36 pre-existing failures no longer reflects reality.

### Fixed this session

- [x] DB-6: `net._http_response` bloat. This was the cause of the production disk IO budget alert. The table had grown to 260 MB holding 1,941 live rows; pg_net's TTL cleanup query accounted for 155,361,594 of 156,229,285 total shared block reads (99.4%, ~1.19 TB). Autovacuum had not run on it since 2026-01-28 because the TTL delete keeps `n_dead_tup` near zero. Reclaimed via `VACUUM FULL`, then made durable with scheduled vacuums (migration `20260728043002`).
- [x] `cron.job_run_details` was never pruned: 313,857 rows / 268 MB back to 2025-09-21. Added a daily 7-day purge plus a vacuum (migrations `20260728042740`, `20260728043002`). Now 32 MB.
- [x] Dropped `process-wine-queue-backup` and moved the stats refresh from every 5 minutes to hourly (migration `20260728042740`).
- [x] `process-wine-queue` cadence: 15 seconds to 5 minutes (migration `20260728043521`). The queue took 2 items in 7 days against 5,750 polls/day. Total pg_net traffic went from 7,766 to 864 calls/day.
- [x] DB-5: leaked-password protection (HIBP) enabled. Also raised the server `password_min_length` from 6 to 8 to match `PASSWORD_MIN_LENGTH` already enforced by the web client.
- [x] IOS-19: placeholder App Store id `id1234567890` replaced with the real `6752897537` (sourced from `ASC_APP_ID` in Doppler), now a single `Constants.App.appStoreId`.
- [x] IOS-21: `googlePlaceDetails(placeId:)` percent-encodes the id and returns `URL?` instead of force-unwrapping; the single caller throws `PlacesError.invalidPlaceId`.
- [x] IOS-18: `ProfileView` no longer re-types the App Store / terms / privacy / web URLs; it uses `Constants.URLs`.
- [x] IOS-BUILD: fixed properly rather than worked around. Deleted seven files from abandoned commit `ee9fe7d` that were never in the pbxproj: `Components/Common/{InfoRow,SectionHeader,StatCard,StarRating}.swift`, `Components/Wine/WineHeader.swift`, and `Core/Theme/{Styles,Typography}.swift`. Several redeclared types defined in the built files (`StatCard`, `InfoRow`, `SectionHeader`, `FilterSection`, `ScaleButtonStyle`) and `Styles.swift` did not compile at all. Synced `project.yml` to the shipped 1.0.3 (build 5) so regeneration does not regress the version. `xcodegen generate` now produces a project that builds clean; `scripts/ship.toml` header updated.

### Scan pipeline data loss, fixed (ARCH-1, IOS-1, IOS-2, IOS-3, IOS-6, AND-1, AND-3, AND-5, AND-6, AND-7, AND-15, AND-16 partial)

The root cause of the 2026-07-04/05 lost-scan incident was still live on both
clients. `repair_orphaned_scans()` only cleaned up after the fact.

- [x] Added `public.submit_scan(p_image_path, p_image_url)` (migration
  `20260728053316`, declared in `supabase/schemas/30_submit_scan.sql`). It creates
  the `scans` row and its `wines_added_queue` item in one atomic call, so they can
  no longer half-apply, and it is idempotent on `image_path` via
  `idempotency_key = 'submit:' || image_path`, matching the `'repair:'` convention.
  Deliberately SECURITY INVOKER so the caller's RLS applies and it does not join
  the SECURITY DEFINER surface DB-2 locked down. It also rejects a path outside the
  caller's own folder, mirroring the storage policy.
- [x] IOS-1: the pipeline ran in `ScannerView`'s `.task`, which SwiftUI cancels on
  view disappearance, so dismissing the sheet aborted it between the storage upload
  and the `scans` insert. It now runs in `ScanService.submitScan`, inside a
  service-owned unstructured `Task` that does not inherit the caller's cancellation.
  A dismissed sheet only stops observing; the submission completes.
- [x] IOS-2: deleted the inline duplicate in `ScannerView` (it diverged from
  `ScanService.uploadScan` in field handling and returned the scan id, not the queue
  id the view actually needs).
- [x] IOS-3: `ScanService` no longer catches everything and returns nil with a DEBUG
  print. `submitScan` throws, with `uploadFailed` and a new `submitFailed` case.
- [x] IOS-6: the realtime channel was only removed after the task group, so
  dismissal leaked it. Now removed in a `defer`. `defer` cannot `await`, so the
  removal is handed to an unstructured task, which still runs on the cancelled path.
- [x] AND-1 / AND-3 / AND-5 / AND-7: `ScannerViewModel` no longer does networking
  inline. It calls `ScanRepository.submitScan`, the repository it already injected
  but never used. The repository body runs in `NonCancellable`, so cancelling
  `viewModelScope` cannot abandon a submission midway.
- [x] AND-6: `ScanRepository.uploadScan` was dead code; it is now the single live
  implementation rather than a second copy.
- [x] AND-15: the poll timeout set `COMPLETED` and an error simultaneously, so the
  UI could not distinguish a finished scan from one it stopped watching. Added a
  `TIMED_OUT` status, handled explicitly in `ScannerSheet`.
- [x] AND-16 (partial): removed the duplicate `ScanInsert`/`QueueInsert` DTOs from
  `ScannerViewModel` and the now-unused ones in `ScanRepository`, plus the
  write-only `successScanId` state field.

Verified: 6 behavioral tests via psql (atomic create, idempotency, correct linkage,
cross-user path rejected, unauthenticated rejected, anon denied) and 4 integration
tests through PostgREST with a real user JWT, confirming the return is a quoted JSON
uuid, which is what both client decode paths assume. iOS BUILD SUCCEEDED, Android
BUILD SUCCESSFUL.

Still open on the clients: the remaining error-swallowing and file-size items
(IOS-7, IOS-10 through IOS-14, AND-8 through AND-14) are untouched. Neither client
was runtime-tested against a simulator or device; both are build-verified only.

### Dispositioned, not fixed

- [-] DB-9 (unused indexes): won't fix. The four indexes total 48 KB on tables with 0-1 rows. Zero scans reflects an unused feature, not a useless index; dropping them saves nothing and risks a future sequential scan.
- [-] DB-4 (hardcoded anon JWT in cron commands): low value. The embedded key is the public anon key already shipped to every browser, so this is a key-rotation ergonomics issue, not an exposure.

### New findings

- [ ] NEW-1: **Captcha cannot be enabled server-side.** `security_captcha_enabled` is false and must stay false. The web client sends `captchaToken` on login and register, but iOS and Android have no captcha implementation at all — enabling it would break mobile auth completely. hCaptcha keys already exist in Doppler, so this looks deliberate but half-finished. Implement on both mobile clients before flipping the flag.
- [ ] NEW-2: **Supabase CLI ships a broken storage image tag.** 2.109.0 through 2.110.0 try to pull `supabase/storage-api:custom-metadata`, which does not exist in any registry, so `supabase start` fails. Workaround: `docker pull supabase/storage-api:v1.67.20 && docker tag supabase/storage-api:v1.67.20 supabase/storage-api:custom-metadata`. Note CI pins `supabase/setup-cli` to 2.109.0 (CI-7), so CI is exposed to the same bug if it ever needs local storage.
- [ ] NEW-3: The `photos` table has never held a row. Dead feature or unfinished one; worth a product decision.

## Fix-loop progress

Fixed so far (verified): repair function + cron fixes (pipeline), enrichment queue scheduled (DB-3/SB-2), public edge function locked down + backdoor `create-test-user` deleted (SB-1), forged-JWT guard hardened (SB-4), deploy.yml path/diff bugs (CI-1/CI-2), `lint:check` script (CI-4 partial), invite auth handoff + `next` threading + open-redirect guard (WA-1/WA-2/WA-12), scan.ts log leak (WA-3), delete-account key (SB-7), config deprecation (SB-11), parse-helper dedup (WA-7), next.config host (WA-9), dead file deleted (WA-10), storage bucket listing scoped (DB-1), SECURITY DEFINER functions locked down + backfill script moved to service role (DB-2), similar-wines catch logging (WA-4), vector-search shared module (WA-8). DB-7/DB-8/DB-11 accepted with reasons. CI workflow hardened (CI-4 lint:check, CI-5 concurrency, CI-7 pinned CLI, CI-16 stop guard); wine-images bucket provisioned + broken anon check removed (WA-5). jest env polyfill via custom environment (WT-0 partial, +2 passing, 0 regressions), alert→toast across tasting editors + invite (WA-11), stuck-loading-flag fixes (WC-3). CI-3 blocked on the remaining WT-0 test-quality/live-network rewrites (documented). Web typecheck + lint clean; remaining unit-test failures are pre-existing test-quality issues (WT-1/2/9) and live-network suites. Sharing sent/received logic bug fixed (WC-9), stale-closure disable removed (WC-7), API error-leak fixes (WA-14), scan-page SPA nav + dead-code cleanup (WA-12/WA-18), enrich-wines call extracted to lib (WA-16), autocomplete error logging (WC-12), CORS + dead domain-check hygiene in shared/security.ts (SB-15/SB-16, Deno-checked, deploy via CI). Vivino silent-catch logging (WA-15), middleware /api exclusion + dead const removed (WA-19), tasks/ hygiene — lessons.md created, todo.md archived (CI-13). SB-5 re-verified as a false alarm (env file untracked, gitignored, never committed). Base cron jobs now in a tracked migration (SB-12), retry-cap constant + a discovered off-by-one that stranded failed queue jobs fixed and deployed (SB-18). Version drift reconciled to Node 22 + pnpm 11 (CI-8), invalid vercel.json key removed (CI-14), testing-doc + seed-numbering docs corrected (CI-15/SB-22), local Postgres major aligned to prod 17 (SB-21). Real test coverage added for pure functions (WT-3 auth/password 30 tests, WT-4 vivino-migration 37 tests, WT-5 search-result-mapper 6, WT-6 stats-service 12) — web passing tests 82 → 161, passing suites 4 → 9. WinePreferencesTab: typed the wine_preferences cast + surfaced save failures via toast (WC-10/WC-11); VivinoMigration exhaustive-deps disable removed via memoized client (WC-6). SB-10/SB-19 deferred (need a full 10-function redeploy for cosmetic import consistency — low value, better via a supervised CI deploy). Profile-page `any` typed (WA-13), createClient-in-render verified benign (WA-21), sharing-preferences cast replaced with a validated mapper (WC-8 partial). Remaining open items are increasingly large refactors (WC-1/2/13, WA-6, SB-6 file splits) in untested code paths that need a running app to verify, plus the deferred iOS/Android findings — these are better done with supervision than blind in an unattended loop. Dispositioned three more with evidence: WA-20 (dark mode isn't wired up, so light-only color literals never mismatch — adding dark: variants would be dead styling), CI-11 (wine-test-1.jpeg is an active fixture used by 4 test files; won't delete), CI-17 (user's own manual dev scripts; not mine to delete unattended). Loop is tailing into refactor/redeploy/user-decision territory. All DB changes are tracked migrations, applied to production and verified. Web typecheck + lint clean, tests non-regressed (82 pass). No commits made.

## Discovered during the fix (not in original audit)

- [x] SEC-0: `create-test-user` edge function (`verify_jwt=false`, no auth) created a hardcoded-password user `testuser@strategicnerds.com` on any anonymous POST. Deleted from production. It was last touched in the repo's git history but is not in the tracked functions tree.

## Fixed during the pipeline investigation (2026-07-10)

- [x] Scan pipeline loses uploads when a client is interrupted mid-submission. Added `repair_orphaned_scans()` plus a 10-minute pg_cron sweep (migration `20260710233002`). Recovered the two lost wines from July 4/5.
- [x] `process-wine-queue` cron used 6-field cron syntax, unsupported by pg_cron, so it ran every 15 minutes instead of every 15 seconds. Now `15 seconds`; backup job every minute.
- [x] `refresh-stats-materialized-views` cron failed on every run for months (refreshed a nonexistent `user_profile_stats_materialized`), so `user_wine_stats_materialized` was never refreshed and user stats were stale. Job rewritten to refresh only the real view.

## Production database (from Supabase advisors and direct inspection)

### High

- [x] DB-1: Scoped the `scans` and `avatars` SELECT policies to the owner folder (migration `20260711002330`). Verified public URLs still return 200 (public buckets don't use RLS for URL access) and anon enumeration now returns `[]`. Advisor `public_bucket_allows_listing` warnings cleared.
- [x] DB-2: Locked down SECURITY DEFINER functions (migration `20260711002523`): revoked EXECUTE from public/anon/authenticated on the 5 trigger functions and 8 internal helpers (insert_label_embedding, invoke_*, refresh/update stats, get_wines_for_visual_embedding, generate_invite_code), re-granting service_role explicitly; dropped anon on the two user-facing sharing RPCs (kept authenticated). Also switched the backfill script from the anon key to the service role key. Advisor now shows only the 3 intentional RPCs (get_invite_by_code needs anon for the invite landing page; the two sharing RPCs are authenticated-only) plus PostGIS's `st_estimatedextent` — accepted (see DB-11). Verified anon is denied on internal fns and still allowed on get_invite_by_code.
- [x] DB-3 / SB-2: `wines_enrichment_queue` 94 pending rows; `process-enrichment-queue` never scheduled. Fixed: migration `20260710235031` schedules it every 5 min; verified a manual drain (3 processed) and the backlog is now draining.

### Medium

- [ ] DB-4: Production cron jobs embed a hardcoded anon JWT in their commands; rotate/centralize (vault or `app.settings`) so key rotation does not break crons.
- [ ] DB-5: Leaked password protection (HaveIBeenPwned check) disabled in Auth settings.
- [ ] DB-6: `net._http_response` table has excessive bloat from cron HTTP calls; configure pg_net cleanup (`net.ttl`) or periodic delete.
- [-] DB-7: `spatial_ref_sys` (PostGIS-owned reference table) has no RLS. Accepted: it holds only public SRID reference data, is owned by the postgis extension (can't add RLS without breaking upgrades), and exposes nothing user-specific.
- [-] DB-8: `http`/`postgis` extensions in `public` schema. Accepted for now: relocating extensions in a live project risks breaking dependent functions/columns (postgis types are used by producers.location); low security value versus high regression risk. Revisit during a planned maintenance window.
- [-] DB-11: PostGIS `st_estimatedextent` is an anon/authenticated-executable SECURITY DEFINER function. Accepted: it is a read-only PostGIS extension function returning bounding-box estimates, owned by the extension.

### Low

- [ ] DB-9: Unused indexes: `idx_photos_tasting_id`, `idx_photos_user_id`, `idx_sharing_connections_viewer_id`, `idx_wine_varietals_varietal_id`. `photos` table has zero rows ever (feature dead?).
- [ ] DB-10: Auth server capped at 10 absolute DB connections; switch to percentage allocation.

## Cross-cutting architecture

- [ ] ARCH-1: Scan submission pipeline is duplicated four times with divergent behavior: `apps/vinho-web/lib/actions/scan.ts`, `apps/vinho-ios/.../ScannerView.swift` (inline), `apps/vinho-ios/.../ScanService.swift` (unused by scanner UI), `apps/vinho-android/.../ScannerViewModel.kt` + `ScanRepository.kt`. Consolidate: one submit path per platform, ideally a single `submit_scan` RPC that creates scan + queue row atomically after upload.

## Client and CI findings (from subagent audits)

### Web app (server actions, API routes, lib, config)

#### High

- [x] WA-1 / WA-2: Rewrote the invite auth handoff. Instead of the dead `/auth/signup` push and unread `pending_invite_code` localStorage, the invite page now sends users to `/auth/register?next=/invite/CODE` (and `/auth/login?...`); the invite page already auto-accepts once a session exists. Added `next` threading through login (password + OAuth), register (email + OAuth), and the auth callback, guarded by a new `safeNext()` open-redirect helper in lib/utils.
- [x] WA-3: Removed the seven console.log calls in `lib/actions/scan.ts` (kept console.error on genuine failures).
- [x] WA-12: Login password success uses `router.push(safeNext(...))`, and `app/scan/page.tsx:303` now uses `router.push("/journal")` instead of `window.location.href`. Both SPA navigations.
- [x] WA-14: `account/delete` and the vivino route catch handlers no longer return raw internal DB/exception strings to the client — they log server-side and return a generic message.
- [x] WA-18: `app/scan/page.tsx` — removed the commented-out `createBrowserClient`/`Database` dead code and collapsed the unreachable nested try/catch in `performScan` into one.
- [x] WA-4: Both similar-wines route 500 handlers now `catch (error)` and `console.error` with context before returning the generic message. (The inner JSON.parse skip-guard was left as-is — it's intentional row-skipping, not an error swallow.)

#### Medium

- [x] WA-5: Root cause was two-fold — the `wine-images` bucket was never provisioned, and `ensureWineImagesBucket` tried to create/verify it with the anon key (which can neither create nor even list buckets; confirmed `listBuckets` returns `[]` for anon). Fixed: provisioned the bucket via migration `20260711005337` (public, 5 MB, image mime types, authenticated INSERT policy), removed the broken runtime check, and dropped the `bucketReady` gate so the Vivino import stores images locally and only falls back to the source URL on a real upload failure.
- [ ] WA-6: `app/api/migrate/vivino/route.ts:21-439` 439-line POST handler with 5-level nesting and per-row sequential awaits. Extract a migration service, batch queries.
- [x] WA-7: `app/api/wines/[id]/similar/route.ts` now imports parseIntSafe/parseFloatSafe from `@/lib/utils` instead of redefining them.
- [x] WA-8: Extracted `lib/vector-search.ts` with the shared Vector Bucket types, `VECTOR_BUCKET`/`VECTOR_INDEX` constants, `SimilarWine`, and a `distanceToSimilarity()` helper. Both routes now import them (the for-user route extends `SimilarWine` with its two extra fields). Typecheck + lint clean.
- [x] WA-9: `next.config.ts` derives the Supabase image host from `NEXT_PUBLIC_SUPABASE_URL` (falls back to the prod host at build time).
- [x] WA-10: Deleted dead `lib/wine-data.ts` (465 lines, zero importers).
- [x] WA-11: Replaced all 7 `alert()` error calls with `toast.error()` (sonner) across WineInfoEditor, WineDetailsEditor, TastingNoteForm, and the invite page; added the sonner imports. Typecheck + lint clean.
- [x] WA-13 (the `any`): Typed the profile-fetch error as `{ code?: string } | null` in the query cast so the PGRST116 check reads `profileError.code` without `as any` (removed the no-explicit-any disable). The broader "split this 309-line component" refactor is left for a supervised pass (WC-1/WC-2 class).
- [x] WA-15: All four bare `catch {}` blocks in the vivino route (region upsert, image download, embedding, start-email) now bind the error and `console.error` with context, preserving the intentional continue/fallback behavior.
- [x] WA-16: Extracted `lib/wine-enrichment-client.ts` with an `enrichWine()` helper that calls `supabase.functions.invoke("enrich-wines")` (session auth handled automatically). `WineDetailsEditor` now calls it instead of hand-building the URL + Bearer header. Typecheck + lint clean.
- [ ] WA-17: Scan submission contract duplicated (scan.ts, vivino route, iOS, Android) — same as ARCH-1.

#### Low

- [x] WA-18: Done (see WA-12/WA-18 note above).
- [x] WA-19: Added `api` to the middleware matcher's negative lookahead so it actually excludes `/api` routes (matching the comment's intent and avoiding a redundant `auth.getUser()` on every API call — the middleware only ever redirects PROTECTED_PATHS/`/auth`, never API). Also removed the unused `PUBLIC_PATHS` dead const.
- [-] WA-20: Not actionable as stated. Dark mode isn't wired up — globals.css defines `.dark` CSS variables, but nothing ever applies the `.dark` class (no theme provider, no toggle, no `prefers-color-scheme` hook), and only one file uses `dark:` variants. The app always renders light, so the `bg-green-50`-style literals never mismatch. Adding `dark:` variants now would be dead styling. Revisit if/when a dark-mode toggle is added.
- [x] WA-21: Verified benign. `lib/supabase.ts` `createClient` wraps `createBrowserClient` from @supabase/ssr 0.7.0 (confirmed installed), which caches and returns a singleton browser client — so render-body `createClient()` calls don't create new clients. No memoization needed for the plain render-body uses; the two that feed hook dep arrays (use-sharing, VivinoMigration) were memoized anyway for lint cleanliness.

Note: service-role usage in the web app was checked and is legitimate (account delete, vector-bucket access), both after user auth.

### Web tests

#### High

- [ ] WT-1: `__tests__/edge-functions/process-wine-queue.test.ts:47-110` and `__tests__/queue/wine-queue-processing.test.ts:21` re-implement queue logic inline and test the copy; the real edge function has zero coverage. Fix: test the actual handler or an extracted core module.
- [ ] WT-2: `__tests__/components/tasting-form-save.test.ts` (480 lines) never imports `TastingNoteForm`; defines its own save functions (lines 327-404) and asserts mock calls. Fix: test the real component or extract save logic into a prod module.
- [x] WT-3: Added `__tests__/validation/auth-validation.test.ts` and `password-strength.test.ts` — 30 behavior-driven tests covering email/password/match/required validation, the error-message map, strength scoring (0-4 boundaries), and requirement flags. All pass.
- [x] WT-4: Added `__tests__/lib/vivino-migration.test.ts` — 37 table-driven tests over all 9 pure functions (CSV line/quote parsing, header skip + short-row skip, Sicily/Sancerre rating rules, wine-type normalization, vintage/NV/notes processing, grouping, region dedup, idempotency-key stability + normalization, batching). All pass. Suite total: web passing tests 82 → 149, zero regressions.

#### Medium

- [x] WT-5: Added `__tests__/lib/search-result-mapper.test.ts` — 6 tests covering the flat→nested mapping, placeholder names for null wine/producer, the defaulted tasted_at date format, null preservation, and the array mapper.
- [x] WT-6: Added `__tests__/lib/stats-service.test.ts` — 6 tests exercising `fetchUserStats` (row mapping, missing-field coercion to 0, error→null) and `getDisplayStats` (display formatting, 0.0 rating fallback, null passthrough) via a mocked Supabase boundary (mocking the external DB, asserting observable output).
- [ ] WT-7: `__tests__/validation/image-upload-validation.test.ts:55` and `__tests__/api/scan-api-integration.test.ts:35` wrap assertions in `if (fs.existsSync(fixture))` so missing fixtures pass silently; `validateImage` defined inside the test. Fix: commit fixture, test real code.
- [ ] WT-8: No API route handler tests (`app/api/migrate/vivino/route.ts` 439 lines, `wines/similar-for-user` 335 lines, `search/tastings`, `account/delete`, `places/*`).
- [ ] WT-9: 268 `toHaveBeenCalled*` mock-interaction assertions dominate; tests assert on mocked Supabase builder chains rather than outcomes.

#### High (discovered during fix loop)

- [~] WT-0: Fixed the environment defect — added `jest.environment.js`, a jsdom environment that injects the Node web globals (fetch/Request/Response/Headers/etc.), and pointed jest.config at it. This removes the `Response is not defined` load errors that were masking the real test state (passing tests 80→82, zero regressions). Remaining failures are now visible and fall into two pre-existing buckets, NOT caused by any fix in this session: (a) genuine test-quality issues — suites mock `@/lib/supabase` but the server actions use `createServerSupabase`/`cookies()`, and some tests carry incomplete `next/navigation` mocks (tracked as WT-1/WT-2/WT-9); (b) live-network suites labelled "REAL"/"Real Workflow" (`e2e/wine-scan-full-flow`, `queue/wine-queue-processing`, `wine-processing/wine-queue`, `varietals/*`) that need a running Supabase and should move behind the integration gate. Both remaining buckets are per-test rewrites — left for a supervised pass rather than mass-editing tests blind. CI-3 stays blocked until (b) is re-gated.

#### Low

- [ ] WT-10: `mockSupabase`/`mockUser` stubs re-declared across 9 test files; extract shared factories.
- [ ] WT-11: `any` types in test files (`user-provider.test.tsx:248,293`, `wine-map.test.tsx:21-37`, `process-wine-queue.test.ts:49-113`, `wine-scan-full-flow.test.ts:20-21`).

### CI/CD and repo hygiene

#### High

- [x] CI-1: `deploy.yml` shared-change detection now globs `supabase/shared/` (and `functions/deno.json`) instead of the nonexistent `functions/_shared/`, triggering full redeploy on shared changes.
- [x] CI-2: `deploy.yml` now diffs `github.event.before..github.sha` (whole push) with a deploy-all fallback when the base commit is unavailable (force push / new branch); `fetch-depth: 0`. Interpolations moved to env vars per the injection-safety hook.
- [~] CI-3: Blocked on WT-0. The edge-function suites are part of the 36 pre-existing failures (jest lacks a fetch/Response polyfill; some hit live Supabase). Wiring them into CI now would just make it red. Fix the jest env first (WT-0), then add the job. Documented, not silently dropped.
- [x] CI-4: ci.yml now runs `pnpm --filter vinho-web run lint:check` (non-mutating) instead of the auto-fixing `lint`.

#### Medium

- [x] CI-5: Added a `concurrency` group (`ci-${{ github.ref }}`, cancel-in-progress) to ci.yml. YAML validated.
- [ ] CI-6: Actions pinned to floating tags (checkout@v4 etc.), not SHAs, despite supply-chain hardening elsewhere.
- [x] CI-7: Pinned `supabase/setup-cli` to `2.109.0` in both ci.yml and deploy.yml (was `latest`).
- [x] CI-8: Reconciled to Node 22 + pnpm 11 everywhere (matches CI, `packageManager: pnpm@11.1.0`, and installed versions): README and CLAUDE.md now say "pnpm 11+", and package.json `engines.node` is `>=22` (was `>=20.18`; engine-strict is off so advisory). JSON validated.
- [ ] CI-9: pnpm-lock.yaml (Dec 2025) predates the May 2026 pnpm@11.1.0 bump; verify/regenerate under pnpm 11 with frozen-lockfile.
- [ ] CI-10: `.npmrc` minimum-release-age failure mode is an opaque CI error after lockfile drift; document or handle.

#### Low

- [-] CI-11: Won't delete. `wine-test-1.jpeg` is an active test fixture referenced by 4 test files (scan-api-integration, edge-function-invocation, wine-scan-full-flow, image-upload-validation); `full_wine_list.csv` is the sample fixture the Vivino manual test + docs reference. Removing them breaks tests / loses fixtures. Moving to Git LFS is a repo-wide infra decision for the user, not an unattended edit — deferred to a supervised call.
- [ ] CI-12: `scripts/AuthKey_AY25H65TAY.p8` (Apple signing key) sits inside the repo dir; untracked and not in history, but relocate outside the repo.
- [x] CI-13: Created `tasks/lessons.md` (referenced by the CLAUDE.md workflow, was missing) with real lessons from this session; added an "archived / completed" header to `tasks/todo.md` noting it predates the pnpm migration. Left `tasks/double-confirmation-email-change.md` alone — it's the user's untracked working spec, not mine to remove.
- [x] CI-14: Removed the invalid `rootDirectory` key from vercel.json (not a vercel.json field — it's a dashboard setting, so it was silently ignored; deployments already succeed via the dashboard root + turbo build command). JSON validated.
- [x] CI-15: Fixed the misleading CLAUDE.md testing comment — `test:ci` is now described as "unit + integration in CI mode (requires local Supabase; excludes edge-function suites)" rather than "all tests for CI" (CI actually runs `test` + `test:integration` separately).
- [x] CI-16 (partial): `supabase stop` now runs with `if: always()`. The `db reset`/seed gap is left open — integration tests may or may not need seeds; not changing test behavior blind.
- [-] CI-17: Deferred to a user decision. These are the user's own manual dev/test scripts (one, test-vivino-migration.js, has a hardcoded stale absolute path so it's already broken). They're harmless and low-value to remove, and deleting someone's tracked tooling unattended isn't appropriate — flagged for the user to prune if they agree.

### iOS app

#### High

- [ ] IOS-1: `ScannerView.swift:400-603` scan write pipeline runs in the view's `.task`; dismissing the sheet cancels it mid-write and loses the scan (this is the incident root cause). Move upload+enqueue to a detached/service-owned task.
- [ ] IOS-2: `ScannerView.swift:522` duplicates `ScanService.uploadScan` with divergent field handling. Delete the inline copy, call the service.
- [ ] IOS-3: `ScanService.swift:116-121` catches every error, returns nil, DEBUG-only print. Make it `throws` with typed errors.
- [x] IOS-4: bound the Face ID toggle in `ProfileSubViews.swift` to the SAME key `BiometricAuthService` reads (`"biometric_auth_enabled"`, default false) so the security toggle actually gates the lock. (Auto-Lock toggle has no reader at all — a dead UX toggle, not a security hole; left as-is, noted for a future auto-lock feature.) Build-verified.
- [x] IOS-5: `TastingService.createTasting` now guards `UUID(uuidString: vintageId)` and returns false on a malformed id instead of fabricating a random UUID that would orphan the tasting. Build-verified.
- [ ] IOS-6: `ScannerView.swift:409-493` realtime channel only removed after the task group; view dismissal leaks the channel. Use `defer`.
- [ ] IOS-7: Direct DB writes in views (`TastingNoteDetailView.swift:566-678`, `JournalView.swift:778-800`, `WineDetailViewModel+Save.swift:8-192`) bypass services. Route through TastingService/WineService.

#### Medium

- [x] IOS-8: deleted `apps/vinho-ios/vinho-ios/VinhoApp.swift` (and its now-empty dir) — an abandoned second `@main` TCA rewrite referencing undefined types (AppReducer/IPadRootView/IPhoneRootView) with TCA not even a dependency. Unreferenced by project.yml and the pbxproj; single `@main` (`Vinho/VinoApp.swift`) now remains.
- [x] IOS-9: removed `CertificatePinningDelegate.swift` — dead code (unreferenced, empty pin set, unconditionally accepted server trust = zero pinning while looking like a security feature). Mirrors the Android P4-4 decision. Build-verified (nothing referenced it).
- [ ] IOS-BUILD (NEW, significant): the committed `Vinho.xcodeproj` builds, but `project.yml` has drifted out of sync with it. `project.yml` globs `sources: - Vinho` with no excludes, so `xcodegen generate` pulls in an abandoned component-extraction under `Components/Common/` (`InfoRow`, `SectionHeader`/`FilterSection`, `StatCard`/`StatItem`, `StarRating`) plus `Components/Wine/WineHeader.swift` — all redeclaring types already defined in the built `WineList/*` files with DIVERGENT initializer signatures — so a regenerated project fails to compile (`invalid redeclaration`, `ambiguous use of 'init'`). This means any xcodegen-based build/deploy was broken. Interim fix applied: `scripts/ship.toml` no longer sets `project_yml`, so ship builds the committed pbxproj and version-bumps it directly (verified: `xcodebuild ... build` → BUILD SUCCEEDED). Proper follow-up (SUPERVISED): either finish consolidating onto `Components/Common/` and delete the `WineList` duplicates + reconcile call sites, or add matching `excludes:` to `project.yml`. Left for a supervised pass — reconciling divergent component APIs blind is exactly the risk this loop avoids.
- [ ] IOS-10: Save ops swallow errors with only a haptic (`TastingNoteDetailView.swift:600,630,672`; all of `WineDetailViewModel+Save.swift`). Present error state.
- [ ] IOS-11: `JournalView.swift:778-800` optimistic delete swallows errors; UI shows row gone while DB keeps it. Surface and re-insert on failure.
- [ ] IOS-12: "Silently continue" catches in `DataService.swift:216,260`, `JournalView.swift:666`, `ScannerView.swift:517`.
- [ ] IOS-13: `TastingService.swift` throughout: catch → return Bool/nil + DEBUG print. Convert to throws.
- [ ] IOS-14: Nine view files over 500 lines (TastingNoteDetailView 1324, ProfileSubViews 999, ProfileView 967, JournalView 867, MapView 757, ScannerView 695, WineListView 666, TastingNoteEditorView 644, AuthenticationView 604).
- [ ] IOS-15: `TastingUpdate` DTO defined twice; many one-off inline Codable structs. Centralize in Core/Models.
- [ ] IOS-16: Mixed NotificationCenter posts vs service notify methods. Standardize.
- [ ] IOS-17: Duplicate `searchWines` in WineService:92 and SearchService:87. Keep one.
- [ ] IOS-18: `ProfileView.swift:296,303,310,857` re-type URLs that exist in `Constants.URLs`.
- [ ] IOS-19: Placeholder App Store id `id1234567890` in `Constants.swift:17` — "Rate app" points at a bogus listing.
- [ ] IOS-20: `VisualSimilarityService.swift:15` hardcoded baseURL. Source from config.
- [ ] IOS-21: `Constants.swift:22-24` unescaped placeId interpolated into `URL(string:)!` — crash on invalid chars.
- [ ] IOS-22: `ScannerView.swift:588-593` Task nested in MainActor.run; consolidate task ownership.

#### Low

- [ ] IOS-23: Dead code: `PendingTastingNotes` (ScannerView:259), `KeychainManager`, `AuthManager.apiBaseURL`.
- [ ] IOS-24: `JournalView.swift:739-772` compactMap silently drops tastings missing joins.
- [ ] IOS-25: `ScannerView.swift:616-649` camera setup aborts silently → black screen.
- [ ] IOS-26: Per-call DateFormatter allocation (`TastingNoteDetailView.swift:615,681`).
- [ ] IOS-27: `SupabaseClient.swift:15` fatalError leaks env var names.
- [ ] IOS-28: `AuthManager.swift:12-15` formatting (dedented properties).
- [ ] IOS-29: ~10 `URL(string:)!` force unwraps in Constants (acceptable, optional cleanup).
- [ ] IOS-30: Fire-and-forget process-wine-queue invokes (`ScannerView:583`, `ScanService:110`) — log failures at minimum.

### Android app

#### High

- [ ] AND-1: Scan-upload pipeline duplicated in `ScannerViewModel.kt:134-198` and `ScanRepository.kt:69-108`. Single repository method.
- [ ] AND-2: `CertificatePinner.kt:9-10` ships placeholder `sha256/AAAA...` pins for *.vinho.dev and *.supabase.co; `VisualSimilarityService:48` uses the pinned client so every recommendations call fails with SSLPeerUnverifiedException. Add real pins or remove pinning.
- [ ] AND-3: Non-atomic multi-step write (same data-loss pattern as iOS) in both copies. Move to one atomic RPC/server path.
- [ ] AND-4: `ScannerViewModel.kt:149` uploads with `upsert = true` (other platforms use false) — silent overwrites. Set false.
- [ ] AND-5: ViewModel injects SupabaseClient and does networking inline, bypassing repository.

#### Medium

- [ ] AND-6: `ScanRepository.uploadScan` is dead code (never called).
- [ ] AND-7: `ScannerViewModel` injects scanRepository but never uses it.
- [ ] AND-8: `TastingRepository.kt:103-171` catches everything, printStackTrace, returns emptyList — network failure indistinguishable from no data.
- [ ] AND-9: Inconsistent error contracts (WineRepository propagates; Tasting/Scan repos swallow).
- [ ] AND-10: `GooglePlacesService.kt:47-53` builds JSON by string concatenation with unescaped user input. Use kotlinx.serialization.
- [ ] AND-11: `VisualSimilarityService:52` hardcodes https://www.vinho.dev; AppConfig imported but unused.
- [ ] AND-12: `AuthRepository.deleteAccount:89` raw HttpURLConnection to hardcoded URL, skips cert pinning.
- [ ] AND-13: `ScannerViewModel.fetchPendingTasting:251-262` grabs newest tasting and assumes it matches the scan — racy. Resolve from queue row.
- [ ] AND-14: `ScannerSheet.kt:436-438` camera onError only resets state; no feedback or logging.
- [ ] AND-15: `ScannerViewModel.kt:242-247` poll timeout sets status COMPLETED plus an error — contradictory. Add TIMED_OUT status.

#### Low

- [ ] AND-16: Duplicate @Serializable DTOs (ScanInsert twice; QueueInsert vs WineQueueInsert with different fields).
- [ ] AND-17: Redundant Hilt wiring (@Inject + @Provides for every repo).
- [ ] AND-18: Five files over 500 lines (ScannerSheet 657, WineDetailScreen 627, TastingDetailScreen 624, TastingEditorScreen 609, JournalScreen 587).
- [ ] AND-19: `HomeViewModel.load:46-49` serial awaits for independent fetches; use async/awaitAll.
- [ ] AND-20: printStackTrace instead of Log.e (TastingRepository 104,127,153,168).
- [ ] AND-21: `VisualSimilarityService:93,138` logs user id and response bodies at Log.d; gate behind DEBUG.
- [ ] AND-22: `developmentPinner` dead code.
- [ ] AND-23: Unused AppConfig imports (VisualSimilarityService:4, AuthRepository:5).
- [ ] AND-24: `ScannerViewModel.kt:173-178` fire-and-forget edge trigger with empty failure path; log it.

### Supabase backend

#### High

- [x] SB-1: `process-wine-queue` was publicly invocable (`verify_jwt=false`, no guard). Fixed: set `verify_jwt = true` in config.toml and redeployed; verified no-token POST now returns 401, anon-key POST returns 200. Also discovered and deleted a `create-test-user` edge function (verify_jwt=false, no auth) that created a known-password admin user on demand.
- [x] SB-2: See DB-3 — enrichment queue scheduled.
- [x] SB-3: `deploy.yml` `_shared/` vs `supabase/shared/` mismatch. Fixed with CI-1.
- [x] SB-4: `isServiceRoleRequest` trusted an unverified decoded JWT payload. Fixed: now strict-compares the bearer token against `VINHO_SERVICE_ROLE_KEY` only; redeployed the four functions using the guard. Note: `send-sharing-invitation-email` has no caller (dead function, see SB-9).
- [-] SB-5: False alarm on re-verification. `supabase/.env.local` is NOT tracked (`git ls-files` empty), has 0 commits in all history, and is already covered by the `.env*` gitignore rule. No action needed; the audit agent's `git ls-files` claim didn't reproduce.

#### Medium

- [ ] SB-6: `process-wine-queue/index.ts` is 1567 lines mixing 3 match strategies, 5 upserts, queueing, and the handler. Split into matching.ts / upserts.ts / enrichment.ts / thin handler.
- [x] SB-7: `delete-account` now prefers `VINHO_SERVICE_ROLE_KEY` (the project convention) and falls back to the platform-injected `SUPABASE_SERVICE_ROLE_KEY`. Verified both secrets exist in the project, so this was a naming inconsistency, not an outage; redeployed.
- [ ] SB-8: markCompleted/markFailed + retry logic copy-pasted between process-wine-queue (1055-1084) and process-enrichment-queue (34-73). Extract shared queue helper.
- [ ] SB-9: Three overlapping enrichment paths (enrich-wines, process-enrichment-queue, process-wine-queue inline); enrich-wines looks legacy. Confirm callers, delete/merge.
- [ ] SB-10: supabase-js imported three different ways (jsr @2, esm.sh @2, npm @2.84.0). Pin one specifier in deno.json import map.
- [x] SB-11: Renamed `[inbucket]` to `[local_smtp]` in config.toml; verified the CLI deprecation warning is gone.
- [x] SB-12: Added tracked migration `20260711025631` that idempotently recreates the 5 base cron jobs (process-wine-queue, -backup, process-wine-embeddings, reset-stuck-embedding-jobs, refresh-stats) — each guarded by `if not exists`, so it's a no-op on production (verified: job count stayed 7 before/after apply) and gives a fresh project the full cron set.
- [ ] SB-13: Silent error swallowing in process-wine-queue (scan updates 1101-1114, dup-check 1139-1147, "Don't fail the job" comments 1415/1439). Check/log error fields.
- [ ] SB-14: Untyped `catch (error)` then `error.message` (index.ts:1562,1071; enrichment `error: any`). Type as unknown, narrow.

#### Low

- [x] SB-15: `getCorsHeaders` now omits `Access-Control-Allow-Origin` for non-whitelisted origins instead of defaulting to the production origin. Deno-checked. Deploys via CI on merge (the shared-code fix — not live-exploitable, browsers already reject a mismatched ACAO — so not force-redeploying ~10 functions in the unattended loop).
- [x] SB-16: Removed the dead `hostname === d.replace(".", "")` branch (only stripped the first dot, never matched) and the redundant project-specific host from `isValidImageUrl`'s trusted-domain check; `endsWith` on the `.supabase.*` suffixes covers it. Deno-checked.
- [ ] SB-17: Batch of 20 jobs via Promise.allSettled with no per-job timeout; one slow API call stalls the batch. Add per-job timeout.
- [x] SB-18 (+ discovered off-by-one): Added `shared/queue.ts` `MAX_QUEUE_RETRIES = 3` and used it in both processors. While doing so, found a real latent bug: process-wine-queue used `newRetryCount > 3`, but the claim RPC only picks up `retry_count < 3` — so a job failing 3 times landed at `retry_count = 3` in `pending`, never retried and never marked `failed` (failures silently stuck; the client's realtime wait on completed/failed would time out). Aligned it to `>= MAX_QUEUE_RETRIES`, matching the enrichment processor and the `retry_count <= 3` constraint. Deployed both; verified both run 200 clean and no jobs are currently affected.
- [ ] SB-19: `functions/deno.json` lacks import map and lockfile. Add both.
- [ ] SB-20: 65 unstructured console.* calls in process-wine-queue (32 in apple-auth-notifications). Add minimal leveled logger in shared/.
- [x] SB-21: Production Postgres is 17.6 (`show server_version`) but config.toml said `major_version = 15` — local dev would run a different major than prod, diverging `db diff`/`reset`. Bumped to 17.
- [x] SB-22: Documented the seed numbering — added `seeds/README.md` explaining 01-05 were archived (they referenced dropped tables) and 06 is the sole active seed copied to `seed.sql`. Also corrected the CLAUDE.md structure note (seed.sql is a copy, not a symlink).

### Web app components and hooks

#### High

- [ ] WC-1: `components/profile/VivinoMigration.tsx` is 820 lines bundling three subcomponents, a realtime hook, and three async handlers. Split into `components/profile/vivino/` plus `hooks/use-queue-status.ts`.
- [ ] WC-2: `components/profile/WinePreferencesTab.tsx` is 738 lines with ~280 lines of inline constants. Extract constants to `lib/data/wine-preferences.ts`, split form sections.
- [x] WC-3: `TastingNoteForm` `handleSave` now resets `isSaving` and shows a toast on the no-user early return (was leaving the button stuck "saving" forever); `fetchUserProfile` resets `isLoading` on the no-user return (was leaving an infinite "Loading..."); the `alert` is now a toast (covered by WA-11).
- [ ] WC-4: `hooks/use-journal-tastings.ts:167-168` `as unknown as Tasting[]` double-cast hides real field mismatches. Type the select result and map explicitly.

#### Medium

- [ ] WC-5: `hooks/use-journal-tastings.ts:188,208,269,282` four exhaustive-deps disables masking stale-closure risk; replace hand-rolled fetch/pagination with React Query.
- [x] WC-6: Memoized the `useQueueStatus` supabase client with `useMemo(() => createClient(), [])` and added it to `fetchQueueStatus`'s dep array, removing the `react-hooks/exhaustive-deps` disable. Typecheck + lint clean.
- [x] WC-7: Wrapped `createDefaultPreferences` in `useCallback`, reordered it before `fetchPreferences`, and added it to the dep array — removed the `react-hooks/exhaustive-deps` disable and the stale-closure hazard.
- [~] WC-8: Replaced the two `user_sharing_preferences` `as UserSharingPreferences` casts with a typechecked `toUserSharingPreferences()` mapper that narrows the jsonb `visible_sharers` (Json) to `string[]` with an `Array.isArray` guard — now validated against both the generated Row type and the app type. The two SharingConnection RPC casts (lines 22, 93) are left as documented casts: the RPC returns `sharer_profile`/`viewer_profile` as `Json` and `status` as `string`, so a full row→SharingConnection mapper is a larger change in an untested, can't-runtime-verify hook — deferred to a supervised pass.
- [x] WC-9: Fixed the logic bug — `getActiveSharesSent` now filters to connections where the current user is the sharer, `getActiveSharesReceived` where they are the viewer (added `currentUserId` state, set from `fetchPreferences`). Previously both returned the identical accepted-status list, so the Sharing page showed the same rows in both sections.
- [x] WC-10: Replaced `wine_preferences as Record<string, any>` (+ the no-explicit-any disable) with a typed `{ wine_types?: string[] } | null` cast.
- [x] WC-11: `savePreferences` failure now logs the error and shows `toast.error("Couldn't save your preferences...")` instead of silently resetting to idle (a failed save previously looked identical to a no-op).
- [x] WC-12: `place-autocomplete.tsx` catch now logs non-abort errors (ignoring expected `AbortError`) and clears results, instead of swallowing every failure silently.
- [ ] WC-13: Tasting select query + row mapping copy-pasted across `use-journal-tastings.ts:123-162`, `use-tastings.ts:102-150`, `use-map-data.ts:58-166`. Extract shared `TASTING_SELECT` + `mapTastingRow`.
- [ ] WC-14: `lib/hooks/use-tastings.ts:83-134` two-round-trip RPC-then-`.in()` fetch; return full rows from the RPC.
- [ ] WC-15: `hooks/use-map-data.ts:220-238` fetches 100 tastings then filters bounds client-side; push bbox filter into SQL.

#### Low

- [ ] WC-16: `SearchBar.tsx:43-84` and `place-autocomplete.tsx:46-72` duplicate debounced-fetch-with-TTL-cache logic; extract a hook.
- [ ] WC-17: `realtime-provider.tsx:36,42` untyped realtime payload casts; empty context interface with lint disable.
- [ ] WC-18: `use-map-data.ts:44` and `TastingNoteForm.tsx:128` cast raw DB values to narrow app types without validation.
