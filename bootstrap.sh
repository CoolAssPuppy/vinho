#!/usr/bin/env bash
set -euo pipefail

SUPABASE_PROJECT_REF="aghiopwrzzvamssgcwpv"
REPO_ROOT="$(pwd)"

echo "Bootstrapping Vinho in $REPO_ROOT (cloud Supabase only)"

# ---------- Helper ----------
need() { command -v "$1" >/dev/null 2>&1; }

# ---------- Preflight ----------
for bin in git node pnpm supabase xcodebuild xcodegen; do
  if ! need $bin; then echo "Missing $bin. Install before continuing."; exit 1; fi
done
if ! need deno; then echo "Warning: Deno not found. Edge Function tests will be skipped."; fi

# ---------- Directory layout ----------
mkdir -p apps/vinho-web apps/vinho-ios packages/{db-types/src,ui,config} supabase/{migrations,functions,seeds} .github/workflows docs scripts

# ---------- Git init ----------
if [ ! -d .git ]; then git init -b main; fi

# ---------- package.json ----------
cat > package.json <<'JSON'
{
  "name": "vinho",
  "private": true,
  "packageManager": "pnpm@9.12.2",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "prepare": "husky install",
    "doctor": "zx ./scripts/doctor.mjs",
    "supa:types": "supabase gen types --lang=ts --project-id aghiopwrzzvamssgcwpv > packages/db-types/src/database.types.ts",
    "supa:dump": "supabase db dump --project-ref aghiopwrzzvamssgcwpv --schema-only > supabase/vinho.sql",
    "supa:push": "supabase db push"
  },
  "devDependencies": {
    "turbo": "^2.0.6",
    "typescript": "^5.6.2",
    "@types/node": "^22.5.1",
    "eslint": "^9.9.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.1",
    "eslint-plugin-promise": "^6.4.0",
    "eslint-plugin-unused-imports": "^4.0.0",
    "prettier": "^3.3.3",
    "husky": "^9.1.5",
    "lint-staged": "^15.2.10",
    "zx": "^8.1.4",
    "json": "^11.0.0"
  },
  "lint-staged": {
    "**/*.{ts,tsx,js,jsx,css,md,json}": ["prettier --write"],
    "**/*.{ts,tsx,js,jsx}": ["eslint --fix"]
  }
}
JSON

# ---------- turbo.json ----------
cat > turbo.json <<'JSON'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "test": { "dependsOn": ["^build"], "outputs": [] },
    "typecheck": { "outputs": [] },
    "lint": { "outputs": [] }
  }
}
JSON

# ---------- .editorconfig ----------
cat > .editorconfig <<'EOF'
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
EOF

# ---------- .gitignore ----------
cat > .gitignore <<'EOF'
node_modules
.env*
dist
build
.next
coverage
.vscode
.idea
*.swp
*.swo
.DS_Store
Thumbs.db
.supabase
supabase/.branches
playwright-report
test-results
xcuserdata
DerivedData
.claude/settings.local.json
CLAUDE.local.md
mcp.json
.mcp.json
EOF

pnpm i
npx husky init

# ---------- Husky hooks ----------
cat > .husky/pre-commit <<'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm lint-staged
EOF
chmod +x .husky/pre-commit

cat > .husky/pre-push <<'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm typecheck && pnpm -w test
EOF
chmod +x .husky/pre-push

# ---------- Supabase link ----------
supabase link --project-ref "$SUPABASE_PROJECT_REF" || true

# ---------- Seed migrations ----------
cat > supabase/migrations/0001_extensions.sql <<'SQL'
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";
create extension if not exists vector;
SQL

cat > supabase/migrations/0002_schema_placeholder.sql <<'SQL'
-- Will be replaced by AI with full Vinho schema, RLS, indexes, RPCs
SQL

# ---------- Docs ----------
cat > README.md <<'MD'
# Vinho

Cloud-only Supabase monorepo for a terroir-first, privacy-respecting wine journal and recommender.
MD

cat > docs/SPEC.md <<'MD'
This file will be overwritten by AI with the complete spec: schema, policies, RPCs, server actions, iOS architecture, testing plan, CI details.
MD

git add .
git commit -m "chore: bootstrap vinho monorepo (cloud Supabase only)"

