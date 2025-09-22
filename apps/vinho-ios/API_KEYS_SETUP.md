# iOS API Keys Setup

## Security notice

Never commit API keys or secrets to version control. The Google Maps API key has been removed from Info.plist for security.

## Setup instructions

### Method 0: Using Doppler (RECOMMENDED - Already configured in this project)

Since this project uses Doppler for secrets management, you can integrate it with Xcode:

1. Install Doppler CLI (if not already installed):

   ```bash
   brew install dopplerhq/cli/doppler
   ```

2. For local development, create a build phase script:
   - In Xcode, select your target
   - Go to Build Phases
   - Add a New Run Script Phase before "Compile Sources"
   - Add this script:

   ```bash
   # Generate xcconfig from Doppler
   if which doppler >/dev/null; then
     doppler secrets download --no-file --format env > "${SRCROOT}/Vinho/Config.local.xcconfig"
     # Convert to xcconfig format
     sed -i '' 's/^/\/\/ /' "${SRCROOT}/Vinho/Config.local.xcconfig"
     sed -i '' 's/\/\/ \([A-Z_]*\)=/\1 = /' "${SRCROOT}/Vinho/Config.local.xcconfig"
   else
     echo "warning: Doppler not installed"
   fi
   ```

3. For CI/CD with Doppler:
   ```bash
   # In your build script
   doppler run -- xcodebuild ...
   ```

## Setup instructions

### Method 1: Using Xcode configuration files (Recommended)

1. Copy the template configuration file:

   ```bash
   cp Vinho/Config.xcconfig Vinho/Config.local.xcconfig
   ```

2. Edit `Config.local.xcconfig` and add your actual API key:

   ```
   GOOGLE_MAPS_API_KEY = YOUR_ACTUAL_API_KEY_HERE
   ```

3. In Xcode:
   - Select your project in the navigator
   - Go to the project settings (not target)
   - Under "Configurations", set the configuration file for Debug and Release to use Config.local.xcconfig

4. Access the key in your code:
   ```swift
   let apiKey = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_MAPS_API_KEY") as? String ?? ""
   ```

### Method 2: Using environment variables

1. Set the environment variable in your shell:

   ```bash
   export GOOGLE_MAPS_API_KEY="your_actual_key_here"
   ```

2. In Xcode scheme:
   - Edit Scheme > Run > Arguments
   - Add environment variable GOOGLE_MAPS_API_KEY

### Method 3: Using a secrets manager (Production)

For production apps, consider using:

- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Or fetch keys from your backend API at runtime

## Important notes

- `Config.local.xcconfig` is gitignored and will not be committed
- Each developer needs to create their own `Config.local.xcconfig`
- For CI/CD, set API keys as environment variables in your build system
- Consider restricting your API keys to specific bundle IDs and IP addresses in the Google Cloud Console

## Revoking the exposed key

Since the API key was exposed in git history:

1. Go to https://console.cloud.google.com/
2. Navigate to APIs & Services > Credentials
3. Delete or regenerate the exposed key (AIzaSyAzskUQS40sfYDrYVmdtBN95qEMnOKJiTM)
4. Create a new restricted key for the Vinho app
5. Add iOS app restrictions with your bundle ID
