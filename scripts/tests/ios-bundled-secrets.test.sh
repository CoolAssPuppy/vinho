#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FETCH_SCRIPT="$REPO_ROOT/apps/vinho-ios/scripts/fetch-doppler-secrets.sh"
PROJECT_YML="$REPO_ROOT/apps/vinho-ios/project.yml"
PROJECT_FILE="$REPO_ROOT/apps/vinho-ios/Vinho.xcodeproj/project.pbxproj"

for forbidden_key in \
  ASC_PRIVATE_KEY \
  HCAPTCHA_SECRET_KEY \
  JINA_API_KEY \
  OPENAI_API_KEY \
  RESEND_API_KEY \
  VINHO_SERVICE_ROLE_KEY
do
  if rg -q "['\"]${forbidden_key}['\"]" "$FETCH_SCRIPT"; then
    echo "forbidden server secret is allowlisted for the iOS bundle: $forbidden_key" >&2
    exit 1
  fi
done

rg -q 'CLIENT_CONFIG_KEYS' "$FETCH_SCRIPT" || {
  echo "iOS config generation must use an explicit client key allowlist" >&2
  exit 1
}

rg -q 'excludes:' "$PROJECT_YML" || {
  echo "project.yml must exclude obsolete secret plist files" >&2
  exit 1
}

if rg -q 'DopplerSecrets\.plist' "$PROJECT_FILE"; then
  echo "DopplerSecrets.plist must not be included in the application target" >&2
  exit 1
fi

echo "iOS bundle secret policy passed"
