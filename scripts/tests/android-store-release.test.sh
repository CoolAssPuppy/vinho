#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_GRADLE="$REPO_ROOT/apps/vinho-android/app/build.gradle.kts"
MANIFEST="$REPO_ROOT/apps/vinho-android/app/src/main/AndroidManifest.xml"
SYNC_SCRIPT="$REPO_ROOT/scripts/sync-android-config.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

grep -Fq 'versionCode = 12' "$APP_GRADLE" || \
  fail "Android source versionCode must advance beyond the published Play code 11."

grep -q 'android.hardware.camera' "$MANIFEST" || \
  fail "Camera access must declare optional camera hardware."
grep -q 'android:required="false"' "$MANIFEST" || \
  fail "Camera hardware must remain optional for Play device support."

if grep -A14 'release {' "$APP_GRADLE" | grep -q 'getByName("debug")'; then
  fail "Release builds must never use the debug signing key."
fi

grep -q 'id("com.google.devtools.ksp")' "$APP_GRADLE" || \
  fail "Hilt must use KSP so Kotlin 2 builds do not fall back to Kotlin 1.9."
grep -q 'ksp("com.google.dagger:hilt-compiler:' "$APP_GRADLE" || \
  fail "The Hilt compiler must run through KSP."

grep -q 'releaseStatus.set.*DRAFT' "$APP_GRADLE" || \
  fail "Automated Play uploads must remain drafts until Console checks pass."

grep -q 'release build cannot be published' "$SYNC_SCRIPT" || \
  fail "Missing signing credentials must produce a clear publishing error."

grep -q 'NEXT_PUBLIC_SUPABASE_URL' "$SYNC_SCRIPT" || \
  fail "Android config must read Vinho's production Supabase URL key."
grep -q 'NEXT_PUBLIC_SUPABASE_ANON_KEY' "$SYNC_SCRIPT" || \
  fail "Android config must read Vinho's production Supabase anon key."
grep -q 'GOOGLE_MAPS_API_KEY' "$SYNC_SCRIPT" || \
  fail "Android config must read Vinho's production Google Maps key."
grep -q 'NEXT_PUBLIC_POSTHOG_KEY' "$SYNC_SCRIPT" || \
  fail "Android config must read Vinho's production PostHog key."
grep -q 'NEXT_PUBLIC_POSTHOG_HOST' "$SYNC_SCRIPT" || \
  fail "Android config must read Vinho's production PostHog host."
grep -q 'Required Android build secret' "$SYNC_SCRIPT" || \
  fail "Android config must stop when a required build secret is empty."

printf 'Android store release checks passed.\n'
