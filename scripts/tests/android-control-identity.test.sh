#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPONENTS="$ROOT/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho/ui/components/VinhoControls.kt"
AUTH="$ROOT/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho/ui/screens/auth/AuthScreen.kt"
HOME="$ROOT/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho/ui/screens/home/HomeScreen.kt"
JOURNAL="$ROOT/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho/ui/screens/journal/JournalScreen.kt"
WINE="$ROOT/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho/ui/screens/wines/WineDetailScreen.kt"
SPLASH="$ROOT/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho/ui/screens/SplashScreen.kt"
TYPE="$ROOT/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho/ui/theme/Type.kt"
MARK="$ROOT/apps/vinho-android/app/src/main/java/com/strategicnerds/vinho/ui/components/VinhoMark.kt"
FONT="$ROOT/apps/vinho-android/app/src/main/res/font/inter_variable.ttf"
SERIF_FONT="$ROOT/apps/vinho-android/app/src/main/res/font/source_serif_variable.ttf"

test -f "$COMPONENTS" || {
  echo "Vinho must define app-specific Android controls"
  exit 1
}

test -f "$FONT" || {
  echo "Vinho Android must bundle Inter instead of using the generic Android system font"
  exit 1
}
test -f "$SERIF_FONT" || {
  echo "Vinho Android must bundle a licensed equivalent for the iOS serif family"
  exit 1
}
grep -Fq 'Font(R.font.inter_variable)' "$TYPE" || {
  echo "Vinho typography must use the bundled cross-platform Inter family"
  exit 1
}
grep -Fq 'val wineTitle' "$TYPE" || {
  echo "Vinho typography must keep the iOS serif treatment for wine titles"
  exit 1
}
grep -Fq 'Font(R.font.source_serif_variable)' "$TYPE" || {
  echo "Vinho wine titles must use the bundled serif family"
  exit 1
}
test -f "$MARK" || {
  echo "Vinho Android must expose the iOS wine mark as a reusable brand component"
  exit 1
}
grep -Fq 'VinhoMark(' "$SPLASH" || {
  echo "Vinho splash must use the brand wine mark"
  exit 1
}
grep -Fq 'VinhoMark(' "$AUTH" || {
  echo "Vinho authentication must use the iOS wine mark"
  exit 1
}
grep -Fq 'Welcome to Vinho' "$AUTH"
grep -Fq 'Your Personal Wine Journey Awaits' "$AUTH"
grep -Fq 'statusBarsPadding()' "$AUTH" || {
  echo "Vinho authentication must remain below the Android status bar"
  exit 1
}
if grep -Fq 'Icons.Rounded.WineBar' "$SPLASH"; then
  echo "Vinho splash must not substitute a stock Material wine icon for the brand mark"
  exit 1
fi

for component in VinhoPrimaryButton VinhoTextField VinhoGlassCard VinhoNavigationDock VinhoSegmentedControl VinhoDialog; do
  grep -Fq "fun $component" "$COMPONENTS" || {
    echo "Missing Vinho control: $component"
    exit 1
  }
done

grep -Fq "BasicTextField" "$COMPONENTS" || {
  echo "Vinho fields must define their own appearance instead of inheriting Material outlined fields"
  exit 1
}
grep -Fq "Brush.linearGradient" "$COMPONENTS" || {
  echo "Vinho controls must use the iOS wine-red gradient"
  exit 1
}

grep -Fq "VinhoTextField(" "$AUTH"
grep -Fq "VinhoPrimaryButton(" "$AUTH"
grep -Fq "VinhoGlassCard(" "$AUTH"
grep -Fq "VinhoNavigationDock(" "$HOME"
grep -Fq "VinhoSegmentedControl(" "$JOURNAL"
grep -Fq 'Add First Note' "$JOURNAL" || {
  echo "Vinho Android must keep the iOS empty-state action"
  exit 1
}
grep -Fq 'icons = listOf' "$JOURNAL" || {
  echo "Vinho Android journal tabs must keep the iOS icon treatment"
  exit 1
}
grep -Fq "VinhoGlassCard(" "$WINE"
grep -Fq 'widthIn(max = 720.dp)' "$JOURNAL" || {
  echo "Vinho journal must cap its width on unfolded devices"
  exit 1
}
grep -Fq 'EmptyState(onAddTasting = onAddTasting, modifier = Modifier.weight(1f))' "$JOURNAL" || {
  echo "Vinho empty state must stay visible in short unfolded windows"
  exit 1
}
grep -Fq 'widthIn(max = 640.dp)' "$AUTH" || {
  echo "Vinho authentication must cap its width on unfolded devices"
  exit 1
}

if grep -Eq '^import androidx\.compose\.material3\.(Button|OutlinedTextField|Card)$' "$AUTH"; then
  echo "Vinho authentication must not import stock Material controls"
  exit 1
fi

echo "Vinho Android control identity contract passed."
