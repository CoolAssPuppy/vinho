# Doppler + Xcode Setup Guide

## Prerequisites

1. Doppler CLI installed: `brew install dopplerhq/cli/doppler`
2. Already authenticated: `doppler login` (you've already done this)
3. Project already configured (✅ vinho project is set up)

## Method 1: Build Phase Script (Recommended for Development)

### Step 1: Add a Run Script Build Phase

1. Open `Vinho.xcodeproj` in Xcode
2. Select the "Vinho" target
3. Go to "Build Phases" tab
4. Click the "+" button → "New Run Script Phase"
5. Drag the new script phase to run BEFORE "Compile Sources"
6. Name it "Inject Doppler Secrets"

### Step 2: Add the Script

Add this script to the build phase:

```bash
#!/bin/bash

# Exit on error
set -e

echo "Injecting secrets from Doppler..."

# Check if Doppler is installed
if ! command -v doppler &> /dev/null; then
    echo "warning: Doppler CLI not installed. Skipping secrets injection."
    echo "warning: Install with: brew install dopplerhq/cli/doppler"
    exit 0
fi

# Create Info.plist with secrets injected
TEMP_PLIST="${TARGET_BUILD_DIR}/${INFOPLIST_PATH}.tmp"
cp "${SRCROOT}/${INFOPLIST_PATH}" "$TEMP_PLIST"

# Get the Google Maps API key from Doppler
GOOGLE_MAPS_KEY=$(doppler secrets get GOOGLE_MAPS_API_KEY --plain 2>/dev/null || echo "")

if [ -n "$GOOGLE_MAPS_KEY" ]; then
    /usr/libexec/PlistBuddy -c "Add :GOOGLE_MAPS_API_KEY string '$GOOGLE_MAPS_KEY'" "$TEMP_PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :GOOGLE_MAPS_API_KEY '$GOOGLE_MAPS_KEY'" "$TEMP_PLIST"
    echo "✅ Google Maps API key injected"
else
    echo "warning: GOOGLE_MAPS_API_KEY not found in Doppler"
fi

# Copy back to the build directory
cp "$TEMP_PLIST" "${TARGET_BUILD_DIR}/${INFOPLIST_PATH}"
rm "$TEMP_PLIST"

echo "✅ Doppler secrets injection complete"
```

### Step 3: Set Working Directory

In the same Run Script phase:

1. Check "Based on dependency analysis"
2. Set "Shell" to `/bin/bash`
3. Under "Input Files", add: `$(SRCROOT)/${INFOPLIST_PATH}`
4. Under "Output Files", add: `$(TARGET_BUILD_DIR)/${INFOPLIST_PATH}`

## Method 2: Using Doppler Run (CI/CD Friendly)

### For Command Line Builds

```bash
# Navigate to iOS app directory
cd apps/vinho-ios

# Build with Doppler injecting environment variables
doppler run -- xcodebuild \
    -project Vinho.xcodeproj \
    -scheme Vinho \
    -configuration Debug \
    -sdk iphonesimulator \
    build
```

### For Xcode GUI

Create a shell script `build-with-doppler.sh`:

```bash
#!/bin/bash
cd "$(dirname "$0")"
doppler run -- xcodebuild "$@"
```

Then in Xcode:

1. Edit Scheme → Build → Pre-actions
2. Add a "New Run Script Action"
3. Set shell to `/bin/bash`
4. Add: `"${SRCROOT}/build-with-doppler.sh"`

## Method 3: Generate xcconfig File (Alternative)

### Step 1: Create a Script

Create `scripts/generate-config.sh`:

```bash
#!/bin/bash

echo "Generating Config.local.xcconfig from Doppler..."

# Generate xcconfig format
doppler secrets download --no-file --format=json | \
    jq -r 'to_entries | .[] | "\(.key) = \(.value)"' > \
    "${SRCROOT}/Vinho/Config.local.xcconfig"

echo "✅ Config.local.xcconfig generated"
```

### Step 2: Add to Build Phase

Add as a Run Script phase (before Compile Sources):

```bash
if [ -f "${SRCROOT}/scripts/generate-config.sh" ]; then
    bash "${SRCROOT}/scripts/generate-config.sh"
fi
```

### Step 3: Configure Xcode to Use xcconfig

1. Select your project (not target) in Xcode
2. Go to "Info" tab
3. Under "Configurations", for both Debug and Release:
   - Click the dropdown next to "Vinho"
   - Select "Config.local" (will appear after first build)

## Method 4: Access in Code

Once secrets are injected via any method above:

### Swift Code

```swift
// In your AppDelegate or wherever you initialize Google Maps
import GoogleMaps

class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // Get API key from Info.plist (injected by Doppler)
        if let apiKey = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_MAPS_API_KEY") as? String,
           !apiKey.isEmpty {
            GMSServices.provideAPIKey(apiKey)
        } else {
            print("Warning: Google Maps API key not found")
        }

        return true
    }
}
```

## Verify Your Setup

### Test Locally

```bash
# Check if Doppler has the key
doppler secrets get GOOGLE_MAPS_API_KEY --plain

# Test the build
doppler run -- xcodebuild -project Vinho.xcodeproj -scheme Vinho -sdk iphonesimulator build
```

### In Xcode

1. Build the project (⌘+B)
2. Check the build logs for "✅ Doppler secrets injection complete"
3. Run the app and verify Google Maps works

## Troubleshooting

### "Doppler CLI not installed"

```bash
brew install dopplerhq/cli/doppler
doppler login
```

### "No Doppler configuration found"

```bash
cd apps/vinho-ios
doppler setup  # Select: vinho project, dev environment
```

### "GOOGLE_MAPS_API_KEY not found"

The key is already in Doppler. Verify with:

```bash
doppler secrets | grep GOOGLE_MAPS_API_KEY
```

### Build fails with "No such file or directory"

Make sure the paths in the build script match your project structure.

## Security Notes

- Never hardcode API keys in code
- Config.local.xcconfig is gitignored
- Doppler secrets are only accessible to authenticated users
- For production, use Doppler's production environment
- Consider using API key restrictions in Google Cloud Console

## CI/CD Integration

For GitHub Actions or other CI:

```yaml
- name: Install Doppler
  run: |
    curl -Ls https://cli.doppler.com/install.sh | sh

- name: Build iOS App
  env:
    DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
  run: |
    doppler run -- xcodebuild \
      -project apps/vinho-ios/Vinho.xcodeproj \
      -scheme Vinho \
      -configuration Release \
      archive
```
