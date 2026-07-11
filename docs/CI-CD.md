# CI/CD

How Vinho builds, tests, and deploys, and the secrets each pipeline needs.

## Pipelines

### PR checks — `.github/workflows/ci.yml`

Runs on every pull request. Jobs:

| Job | What it does | Needs a DB |
|-----|--------------|------------|
| `lint-and-typecheck` | `eslint`, `tsc --noEmit`, `pnpm audit --audit-level=high` | no |
| `test` | Jest unit suite (`test:ci`) | no |
| `validate-migrations` | `supabase start` → `db reset`, then fails if committed `lib/database.types.ts` is stale | yes (local) |
| `integration-and-pgtap` | `supabase test db` (pgTAP) + `test:integration` (live-DB Jest suites, `RUN_INTEGRATION=1`) | yes (local) |
| `build` | `next build` | no |
| `e2e` | `supabase start` + `db reset` (seeds the test user), installs Chromium, runs Playwright, uploads the report on failure | yes (local) |

The "local" DB is a Supabase stack started on the runner via the CLI — no cloud project is touched by PR checks.

### Deploy — `.github/workflows/deploy.yml`

Runs on merge to `main`. Pushes migrations and deploys changed edge functions to the cloud project. The **web app deploys via Vercel's Git integration** (the `vinho` Vercel project auto-deploys from `main`), so there is no web-deploy job here — the CI `build` job is the gate.

### Mobile — `scripts/ship.py` (iOS) and `scripts/release-android.sh` (Android)

Mobile ships from the CLI, not GitHub Actions, with Doppler as the secret source (see `docs/DOPPLER_SETUP.md`). iOS builds the committed `Vinho.xcodeproj` (see note below).

## Required GitHub Actions secrets

### Web build / deploy

| Secret | Used by | Purpose |
|--------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `build` | Public Supabase URL baked into the web build |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `build` | Public anon key for the web build |
| `SUPABASE_ACCESS_TOKEN` | `deploy` | Authenticates the Supabase CLI for `db push` / function deploy |
| `SUPABASE_DB_PASSWORD` | `deploy` | Database password for `supabase db push` |
| `SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_REF` | `deploy` | Target cloud project (`aghiopwrzzvamssgcwpv`) |

The `validate-migrations`, `integration-and-pgtap`, and `e2e` jobs need **no cloud secrets** — they run a local Supabase stack and read its generated anon key at runtime.

### Mobile signing (only if you add CI mobile jobs; today mobile ships from the CLI)

iOS (App Store Connect API, via Doppler `vinho/prd`): `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_APP_ID`, and the `AuthKey_<ASC_KEY_ID>.p8` file (kept in `~/.private_keys`, never in the repo).

Android (see `apps/vinho-android/PLAY-STORE-SUBMIT-PROCESS.md`): `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_PLAY_SA_JSON` (Play publisher service account).

## Running the suites locally

```bash
pnpm --filter vinho-web test              # unit (no DB)
pnpm --filter vinho-web test:integration  # live-DB Jest (needs local Supabase)
supabase test db                          # pgTAP (needs local Supabase)
pnpm --filter vinho-web test:e2e          # Playwright (needs local Supabase + browsers)
```

> Known local gotcha (project memory): the Supabase CLI can hang on `db reset`/`start`
> on some machines (pg_cron/pg_net/realtime hold connections). Apply the schema via
> direct `psql` if that happens. CI runners start cleanly.

## iOS build note

`apps/vinho-ios/project.yml` (xcodegen) has drifted out of sync with the committed
`Vinho.xcodeproj`: its `sources: - Vinho` glob pulls in an abandoned
`Components/Common/` component-extraction that redeclares types already defined in
the built `WineList/*` files, so `xcodegen generate` produces a project that fails to
compile. The committed `.xcodeproj` builds correctly, so `scripts/ship.toml` does
**not** set `project_yml` — ship builds the committed project and version-bumps its
pbxproj directly. Completing that extraction (or adding matching `excludes` to
`project.yml`) is a tracked follow-up in `tasks/tech-debt-audit.md` (IOS-BUILD).
