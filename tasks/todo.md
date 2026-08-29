# Vinho store release

- [x] Read repository and release instructions
- [x] Audit iOS, Android, signing, and release automation
- [x] Add release-gate tests for Android signing and store requirements
- [x] Fix Android lint and compiler warnings
- [x] Configure Vinho Android signing in Doppler
- [x] Build and test web, iOS, and Android release targets
- [x] Audit App Store Connect metadata and build state
- [ ] Create or finish the Google Play app record
- [ ] Upload verified iOS and Android builds
- [ ] Complete store metadata, screenshots, declarations, and review submission
- [ ] Record build numbers, release states, and any store review wait

## Review

Version 1.0.5 build 8 passes web, integration, database, iOS, Android,
release-build, and mobile-parity checks. The production queue repair and edge
functions are deployed. Store tester rollout is in progress.

## Backlog

- [ ] Add persistent wine favorites backed by per-user database records and RLS policies
- [ ] Add a Favorites list on iOS, Android, and web with matching search, sorting, empty, loading, and error states
- [ ] Add behavior tests and extend the mobile parity contract for favorite, unfavorite, and Favorites-list flows

# Archived Vinho performance, readability, and documentation

> Archived: this plan was completed on 2026-02-12. All items below are done.
> It is kept for history. Active tech-debt work lives in `tech-debt-audit.md`.
> Note: command references below predate the pnpm migration — use `pnpm`, not `npm`.

## Phase 1 + 3: Web changes (shared utilities, caching, refactoring)

- [x] 3.5 Extract parseIntSafe/parseFloatSafe to lib/utils.ts
- [x] 3.4 Extract getAuthenticatedClient to lib/supabase-server.ts
- [x] 1.5 Add Cache-Control header to similar-for-user route + use shared auth
- [x] 3.4b Update account/delete route to use shared auth
- [x] 3.5b Update search/tastings route to use shared utils
- [x] 1.3 Add caching to place-autocomplete.tsx
- [x] 1.4 Add caching to SearchBar.tsx
- [x] 3.2 Extract search result mapper
- [x] 3.1 Extract journal hook (use-journal-tastings.ts)
- [x] 1.2 + 1.6 Debounce realtime handlers + optimistic tasting update
- [x] 1.1 Replace VivinoMigration polling with Supabase Realtime
- [x] 3.3 Extract VivinoMigration sub-components

## Phase 2: iOS changes (parallel agent)

- [x] 2.1 Replace scan polling with Supabase Realtime
- [x] 2.2 Add caching to VisualSimilarityService
- [x] 2.3 Add caching to PlaceAutocompleteField

## Phase 4: Documentation (parallel agent)

- [x] Add image processing pipeline to README

## Phase 5: Verification

- [x] npm run build (passes)
- [x] npm run lint (0 errors, only pre-existing warnings)
- [x] Verify response shape unchanged (similar-for-user response body untouched)
