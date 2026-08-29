#!/usr/bin/env bash
# scripts/sync-android-config.sh
#
# Materialize apps/vinho-android/local.properties, the release keystore, and the
# Google Play service-account JSON from Doppler, so the Android build never
# drifts from the source of truth (web/iOS already pull from Doppler). The
# Android analog of the iOS Doppler sync baked into scripts/ship.py.
#
# Usage:
#   ./scripts/sync-android-config.sh            # prd (default)
#   ./scripts/sync-android-config.sh dev        # dev config
#
# Doppler is canonical. Required Doppler keys (vinho project):
#   Build config:  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#                  GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_POSTHOG_KEY,
#                  NEXT_PUBLIC_POSTHOG_HOST  (VINHO_API_BASE_URL optional)
#   Release signing (for publishing): ANDROID_RELEASE_KEYSTORE_BASE64,
#                  ANDROID_RELEASE_STORE_PASSWORD, ANDROID_RELEASE_KEY_ALIAS,
#                  ANDROID_RELEASE_KEY_PASSWORD
#   Play publishing: ANDROID_PLAY_SA_JSON  (service-account JSON)
# If the signing/Play keys are absent, existing RELEASE_* lines and any existing
# SA JSON are preserved (so a dev checkout still builds debug).
#
# sdk.dir stays machine-local. Everything written carries credentials, so files
# are owner-only (umask 077) and the JSON/keystore are gitignored.

set -euo pipefail
umask 077

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$REPO_ROOT/apps/vinho-android"
LOCAL_PROPS="$ANDROID_DIR/local.properties"
KEYSTORE_DIR="$ANDROID_DIR/app/keystore"
KEYSTORE_FILE="$KEYSTORE_DIR/vinho-release.jks"
SA_JSON="$ANDROID_DIR/play-service-account.json"
DOPPLER_PROJECT="vinho"
CONFIG="${1:-prd}"

if [ -t 1 ]; then
  step() { printf '\n\033[1;34m> %s\033[0m\n' "$1"; }
  ok()   { printf '\033[1;32m== %s ==\033[0m\n' "$1"; }
  warn() { printf '\033[1;33m! %s\033[0m\n' "$1"; }
  die()  { printf '\033[1;31mx %s\033[0m\n' "$1" >&2; exit 1; }
else
  step() { printf '\n>> %s\n' "$1"; }
  ok()   { printf '== %s ==\n' "$1"; }
  warn() { printf '!! %s\n' "$1"; }
  die()  { printf 'xx %s\n' "$1" >&2; exit 1; }
fi

command -v doppler >/dev/null 2>&1 || die "doppler CLI not found. brew install dopplerhq/cli/doppler"

# Pull the whole config once as JSON (single network round-trip).
step "Fetching Doppler config $DOPPLER_PROJECT/$CONFIG"
SECRETS_JSON="$(doppler secrets download --no-file --format json \
  --project "$DOPPLER_PROJECT" --config "$CONFIG" 2>/dev/null)" \
  || die "doppler fetch failed for $DOPPLER_PROJECT/$CONFIG (authenticated?)"

get() { printf '%s' "$SECRETS_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('$1',''))"; }

get_first() {
  local key value
  for key in "$@"; do
    value="$(get "$key")"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
}

require_value() {
  local label="$1" value="$2"
  [ -n "$value" ] || die "Required Android build secret is empty: $label"
}

SUPABASE_URL_VALUE="$(get_first SUPABASE_URL NEXT_PUBLIC_SUPABASE_URL)"
SUPABASE_ANON_KEY_VALUE="$(get_first SUPABASE_ANON_KEY NEXT_PUBLIC_SUPABASE_ANON_KEY)"
MAPS_API_KEY_VALUE="$(get_first MAPS_API_KEY GOOGLE_MAPS_API_KEY)"
POSTHOG_API_KEY_VALUE="$(get_first POSTHOG_API_KEY NEXT_PUBLIC_POSTHOG_KEY)"
POSTHOG_HOST_VALUE="$(get_first POSTHOG_HOST NEXT_PUBLIC_POSTHOG_HOST)"

require_value "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL_VALUE"
require_value "SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY_VALUE"
require_value "MAPS_API_KEY or GOOGLE_MAPS_API_KEY" "$MAPS_API_KEY_VALUE"
require_value "POSTHOG_API_KEY or NEXT_PUBLIC_POSTHOG_KEY" "$POSTHOG_API_KEY_VALUE"
require_value "POSTHOG_HOST or NEXT_PUBLIC_POSTHOG_HOST" "$POSTHOG_HOST_VALUE"

# Preserve any machine-local sdk.dir line.
SDK_DIR_LINE="$(grep -E '^sdk.dir=' "$LOCAL_PROPS" 2>/dev/null || true)"

step "Writing $LOCAL_PROPS"
{
  [ -n "$SDK_DIR_LINE" ] && echo "$SDK_DIR_LINE"
  echo "SUPABASE_URL=$SUPABASE_URL_VALUE"
  echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY_VALUE"
  echo "VINHO_API_BASE_URL=$(get VINHO_API_BASE_URL)"
  echo "MAPS_API_KEY=$MAPS_API_KEY_VALUE"
  echo "POSTHOG_API_KEY=$POSTHOG_API_KEY_VALUE"
  echo "POSTHOG_HOST=$POSTHOG_HOST_VALUE"
} > "$LOCAL_PROPS"

# Release keystore + signing (only when present in Doppler).
KEYSTORE_B64="$(get ANDROID_RELEASE_KEYSTORE_BASE64)"
if [ -n "$KEYSTORE_B64" ]; then
  step "Materializing release keystore"
  mkdir -p "$KEYSTORE_DIR"
  printf '%s' "$KEYSTORE_B64" | base64 --decode > "$KEYSTORE_FILE"
  {
    echo "RELEASE_STORE_FILE=$KEYSTORE_FILE"
    echo "RELEASE_STORE_PASSWORD=$(get ANDROID_RELEASE_STORE_PASSWORD)"
    echo "RELEASE_KEY_ALIAS=$(get ANDROID_RELEASE_KEY_ALIAS)"
    echo "RELEASE_KEY_PASSWORD=$(get ANDROID_RELEASE_KEY_PASSWORD)"
  } >> "$LOCAL_PROPS"
else
  warn "ANDROID_RELEASE_KEYSTORE_BASE64 not in Doppler; the release build cannot be published."
fi

# Play publishing service account (only when present).
SA="$(get ANDROID_PLAY_SA_JSON)"
if [ -n "$SA" ]; then
  step "Materializing Play service-account JSON"
  printf '%s' "$SA" > "$SA_JSON"
  chmod 600 "$SA_JSON"
else
  warn "ANDROID_PLAY_SA_JSON not in Doppler — release-android.sh cannot upload to Play."
fi

ok "Android config synced from $DOPPLER_PROJECT/$CONFIG"
