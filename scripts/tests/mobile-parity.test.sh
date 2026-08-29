#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ios_root="$repo_root/apps/vinho-ios/Vinho"
android_root="$repo_root/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho"

require_text() {
  local path="$1"
  local pattern="$2"
  local description="$3"

  if ! rg --quiet --fixed-strings "$pattern" "$path"; then
    echo "Missing mobile parity item: $description ($path)" >&2
    exit 1
  fi
}

forbid_text() {
  local path="$1"
  local pattern="$2"
  local description="$3"

  if rg --quiet --fixed-strings "$pattern" "$path"; then
    echo "Unmatched mobile parity item: $description ($path)" >&2
    exit 1
  fi
}

require_text "$ios_root/Views/Auth/AuthenticationView.swift" 'title: "Apple"' "iOS Apple sign-in"
require_text "$android_root/ui/screens/auth/AuthScreen.kt" 'viewModel.signInWith(Apple)' "Android Apple sign-in"
require_text "$ios_root/Views/Auth/AuthenticationView.swift" 'title: "Google"' "iOS Google sign-in"
require_text "$android_root/ui/screens/auth/AuthScreen.kt" 'viewModel.signInWith(Google)' "Android Google sign-in"

require_text "$ios_root/Views/ContentView.swift" 'JournalView()' "iOS journal"
require_text "$android_root/ui/screens/home/HomeScreen.kt" 'JournalScreen(' "Android journal"
require_text "$ios_root/Views/ContentView.swift" 'ScannerView()' "iOS scanner"
require_text "$android_root/ui/screens/home/HomeScreen.kt" 'ScannerSheet(' "Android scanner"
require_text "$ios_root/Views/ContentView.swift" 'MapView()' "iOS map"
require_text "$android_root/ui/screens/home/HomeScreen.kt" 'MapScreen(' "Android map"

require_text "$ios_root/Views/Profile/ProfileView.swift" 'case notifications' "iOS notifications navigation"
require_text "$android_root/ui/screens/home/HomeScreen.kt" 'NotificationsScreen(' "Android notifications navigation"
require_text "$ios_root/Views/Profile/ProfileView.swift" 'WinePreferencesView()' "iOS wine preferences"
require_text "$android_root/ui/screens/home/HomeScreen.kt" 'WinePreferencesScreen(' "Android wine preferences"
require_text "$android_root/ui/screens/profile/ProfileSheet.kt" 'ProfileStats(' "Android profile stats"
require_text "$android_root/ui/screens/home/HomeScreen.kt" 'onProfileUpdated()' "Android profile refresh after save"
require_text "$android_root/ui/screens/wines/WineDetailScreen.kt" 'FoodPairingsCard(' "Android food pairings"
forbid_text "$ios_root/Views/WineList/WineActionButtons.swift" 'shareButton' "non-functional iOS-only wine sharing action"
forbid_text "$ios_root/Views/WineList/WineActionButtons.swift" 'addToCollectionButton' "non-functional iOS-only collection action"
forbid_text "$ios_root/Views/WineList/WineDetailViewModel.swift" 'toggleFavorite' "non-persistent iOS-only favorite action"
forbid_text "$ios_root/Views/Journal/TastingNoteDetailView.swift" 'showingShareSheet' "non-functional iOS-only tasting share action"
require_text "$ios_root/Views/Profile/ProfileView.swift" 'VivinoImportInfoView()' "iOS Vivino import guidance"
require_text "$android_root/ui/screens/home/HomeScreen.kt" 'VivinoImportScreen(' "Android Vivino import guidance"
require_text "$ios_root/Views/Profile/SubViews/AboutView.swift" 'struct AboutView' "iOS About page"
require_text "$android_root/ui/screens/home/HomeScreen.kt" 'AboutScreen(' "Android About page"
require_text "$ios_root/Views/Profile/SubViews/ProfileSubViews.swift" 'Download My Data' "iOS data export"
require_text "$android_root/ui/screens/profile/ProfileSheet.kt" 'Download My Data' "Android data export"
require_text "$ios_root/Core/Services/DeepLinkHandler.swift" 'acceptPendingInviteIfNeeded' "iOS invite-link acceptance after sign-in"
require_text "$android_root/core/deeplink/AppDeepLink.kt" 'data class Invite' "Android invite-link routing"
require_text "$android_root/data/repository/SharingRepository.kt" 'acceptInviteByCode' "Android invite-link acceptance"

ios_version="$(awk '/MARKETING_VERSION:/{gsub(/[[:space:]\"]/, "", $2); print $2; exit}' "$repo_root/apps/vinho-ios/project.yml")"
android_version="$(awk -F'"' '/versionName =/{print $2; exit}' "$repo_root/apps/vinho-android/app/build.gradle.kts")"

if [[ -z "$ios_version" || "$ios_version" != "$android_version" ]]; then
  echo "Mobile version mismatch: iOS=$ios_version Android=$android_version" >&2
  exit 1
fi

echo "Mobile parity contract passed for version $ios_version."
