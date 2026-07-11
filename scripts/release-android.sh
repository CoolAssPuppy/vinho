#!/usr/bin/env bash
# scripts/release-android.sh
#
# Build the signed Android App Bundle (AAB) and upload it to a Google Play track
# as a DRAFT for manual review and roll-out in Play Console. The Android analog
# of scripts/ship.py for iOS: one command, no Android Studio, no manual
# bundling. The release lands as a draft so the owner completes review/roll-out.
#
# Usage:
#   ./scripts/release-android.sh                 # internal track (default)
#   ./scripts/release-android.sh internal|alpha|beta|production
#   SKIP_CONFIG_SYNC=1 ./scripts/release-android.sh   # use local.properties as-is
#   SKIP_VERSION_BUMP=1 ./scripts/release-android.sh  # retry with the same build
#
# What it does:
#   1. sync-android-config.sh (prd) materializes the release keystore + prod
#      config into apps/vinho-android/local.properties AND the Play publishing
#      service-account JSON into apps/vinho-android/play-service-account.json.
#   2. Bumps versionCode (Play rejects a reused code).
#   3. ./gradlew :app:publishReleaseBundle --track <track>. releaseStatus is
#      DRAFT (set in app/build.gradle.kts), so nothing goes live until promoted.
#
# Prereqs: doppler CLI authed to project vinho; the service account in
# ANDROID_PLAY_SA_JSON must have Play Console access to com.strategicnerds.vinho.
# Production track is gated by Play's personal-account closed-testing rule.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$REPO_ROOT/apps/vinho-android"
APP_ID="com.strategicnerds.vinho"
SA_JSON="$ANDROID_DIR/play-service-account.json"

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

TRACK="${1:-internal}"
case "$TRACK" in
  internal|alpha|beta|production) ;;
  -h|--help) sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) die "unknown track: $TRACK (use: internal | alpha | beta | production)" ;;
esac

if [ "$TRACK" = "production" ]; then
  warn "production track is gated by Play's personal-account closed-test requirement"
  warn "(12 testers / 14 days). Play will reject this until that clears."
fi

if [ "${SKIP_CONFIG_SYNC:-0}" != "1" ]; then
  step "Syncing config + signing + Play service account from Doppler"
  "$REPO_ROOT/scripts/sync-android-config.sh" "${DOPPLER_CONFIG:-prd}" \
    || die "config sync failed — Doppler unavailable? (or run with SKIP_CONFIG_SYNC=1)"
fi

[ -f "$SA_JSON" ] || die "missing $SA_JSON — ANDROID_PLAY_SA_JSON not in Doppler? Cannot authenticate to Play."

GRADLE_FILE="$ANDROID_DIR/app/build.gradle.kts"
if [ "${SKIP_VERSION_BUMP:-0}" != "1" ]; then
  CURRENT_CODE="$(grep -E '^[[:space:]]*versionCode[[:space:]]*=' "$GRADLE_FILE" | grep -oE '[0-9]+' | head -1)"
  [ -n "$CURRENT_CODE" ] || die "could not find versionCode in $GRADLE_FILE"
  NEXT_CODE=$((CURRENT_CODE + 1))
  perl -pi -e "s/(versionCode\s*=\s*)\d+/\${1}$NEXT_CODE/" "$GRADLE_FILE"
  step "Bumped versionCode $CURRENT_CODE -> $NEXT_CODE (commit $GRADLE_FILE after the release)"
fi

step "Building + uploading signed AAB to '$TRACK' track as a DRAFT"
( cd "$ANDROID_DIR" && ./gradlew :app:publishReleaseBundle --track "$TRACK" --console=plain )

ok "uploaded $APP_ID to '$TRACK' as a draft"
echo "   Finish review and roll-out in Play Console:"
echo "   https://play.google.com/console -> $APP_ID -> Testing/$TRACK -> review draft"
