#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
android_root="$repo_root/apps/vinho-android/app/src/main"
source_root="$android_root/java/com/strategicnerds/vinho"

require_text() {
  local path="$1"
  local text="$2"
  local description="$3"
  rg --quiet --fixed-strings "$text" "$path" || {
    echo "Missing Android visual parity item: $description ($path)" >&2
    exit 1
  }
}

forbid_text() {
  local path="$1"
  local text="$2"
  local description="$3"
  if rg --quiet --fixed-strings "$text" "$path"; then
    echo "Unwanted Android visual item: $description ($path)" >&2
    exit 1
  fi
}

colors="$source_root/ui/theme/Color.kt"
home="$source_root/ui/screens/home/HomeScreen.kt"
journal="$source_root/ui/screens/journal/JournalScreen.kt"
activity="$source_root/VinhoActivity.kt"

require_text "$colors" 'Color(0xFFB84141)' "iOS wine-red primary color"
require_text "$colors" 'Color(0xFFD9A67A)' "iOS gold accent color"
require_text "$colors" 'Color(0xFF141416)' "iOS dark background color"
require_text "$colors" 'Color(0xFF1C1C1E)' "iOS card color"
require_text "$colors" 'Color(0xFF28282B)' "iOS elevated card color"
forbid_text "$colors" 'Color(0xFF7B61FF)' "unrelated purple brand color"
forbid_text "$home" 'VinhoGradient' "gradient navigation and avatar styling"
forbid_text "$home" '\uD83D\uDCF7' "camera emoji"
require_text "$home" 'Icons.Rounded.PhotoCamera' "real camera icon"
require_text "$home" 'VinhoFloatingNavigation' "iOS-style floating navigation"
require_text "$activity" 'SystemBarStyle.dark' "readable light system icons on the dark app background"
require_text "$journal" 'Icons.AutoMirrored.Rounded.MenuBook' "journal empty-state icon"
require_text "$android_root/res/drawable/ic_launcher_foreground.xml" '#FFFFFF' "white launcher mark"
require_text "$android_root/res/drawable/ic_launcher_background.xml" '#AF002F' "matching wine-red launcher background"

echo "Android visual parity contract passed."
