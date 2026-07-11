# Vinho Play Store assets

Generated store listing graphics and the recipe for capturing phone screenshots.

## Files

| File | Play Console field | Spec | Status |
|------|--------------------|------|--------|
| `play-store-icon-512.png` | App icon (hi-res) | 512×512, 32-bit PNG | ready |
| `feature-graphic-1024x500.png` | Feature graphic | 1024×500, PNG/JPEG, no alpha | ready |
| `phone/*.png` | Phone screenshots | 2–8 images, 16:9 or 9:16, min 320px, max 3840px | capture (see below) |

Both graphics were generated from `apps/vinho-web/public/icon-512.png` on the brand
burgundy (`#722F37`). The icon was flattened to remove transparency (Play accepts a
32-bit PNG but the pixels are opaque). To regenerate, re-run the ImageMagick commands
in the project history or the snippet at the bottom of this file.

## Screenshot capture recipe

Play requires 2–8 phone screenshots. The debug build points at the production
Supabase project, so sign in with a real account that has tastings to get populated
screens. Recommended shots: Journal (populated), Wine detail, Map (Regions mode),
Scanner, Sharing, Profile.

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
ADB="$ANDROID_HOME/platform-tools/adb"
OUT="apps/vinho-android/store-assets/phone"
mkdir -p "$OUT"

# 1. Boot an emulator (Pixel_9_Pro_XL gives a clean tall frame) or plug in a device.
"$ANDROID_HOME/emulator/emulator" -avd Pixel_9_Pro_XL -no-snapshot -no-audio &
"$ADB" wait-for-device
# wait until fully booted:
until [ "$("$ADB" shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done

# 2. Install the app.
(cd apps/vinho-android && ./gradlew :app:assembleDebug)
"$ADB" install -r apps/vinho-android/app/build/outputs/apk/debug/app-debug.apk

# 3. Launch, sign in manually, navigate to a screen, then capture:
"$ADB" shell am start -n com.strategicnerds.vinho/.VinhoActivity
# ...navigate to the screen you want, then:
"$ADB" exec-out screencap -p > "$OUT/01-journal.png"
# repeat for 02-wine-detail.png, 03-map.png, 04-scanner.png, 05-sharing.png, 06-profile.png
```

Tip: hide the status bar clock/notifications for cleaner shots with the demo-mode
overlay before capturing:

```bash
"$ADB" shell settings put global sysui_demo_allowed 1
"$ADB" shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0900
"$ADB" shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
"$ADB" shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# restore afterwards:
"$ADB" shell am broadcast -a com.android.systemui.demo -e command exit
```

## Regenerating the graphics

```bash
SRC=apps/vinho-web/public/icon-512.png
OUT=apps/vinho-android/store-assets
FONT="/System/Library/Fonts/Supplemental/Georgia.ttf"

# Hi-res icon (opaque)
magick "$SRC" -background "#722F37" -flatten -resize 512x512 -depth 8 PNG32:"$OUT/play-store-icon-512.png"

# Feature graphic
magick -size 1024x500 "gradient:#8B3A42-#4E2025" "$OUT/_bg.png"
magick "$SRC" -resize 280x280 "$OUT/_fg.png"
magick "$OUT/_bg.png" "$OUT/_fg.png" -gravity West -geometry +80+0 -composite \
  -font "$FONT" -fill "#FFFFFF" -gravity West -pointsize 96 -annotate +400+0 "Vinho" \
  -font "$FONT" -fill "#EAD9DB" -gravity West -pointsize 34 -annotate +404+70 "Your wine tasting journal" \
  PNG24:"$OUT/feature-graphic-1024x500.png"
rm -f "$OUT/_bg.png" "$OUT/_fg.png"
```
