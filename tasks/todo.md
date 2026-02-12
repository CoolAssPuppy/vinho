# Vinho performance, readability, and documentation

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
