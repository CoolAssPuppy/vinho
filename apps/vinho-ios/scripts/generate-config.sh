#!/bin/bash

# Generate Xcode config file from Doppler secrets

set -e

echo "Generating Config.local.xcconfig from Doppler..."

# Check if Doppler is installed
if ! command -v doppler &> /dev/null; then
    echo "Error: Doppler CLI not installed"
    echo "Install with: brew install dopplerhq/cli/doppler"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Vinho.xcodeproj/project.pbxproj" ]; then
    echo "Error: Must run from apps/vinho-ios directory"
    exit 1
fi

# Create the config file
CONFIG_FILE="Vinho/Config.local.xcconfig"

# Generate xcconfig format from Doppler
echo "// Auto-generated from Doppler - DO NOT COMMIT" > "$CONFIG_FILE"
echo "// Generated at: $(date)" >> "$CONFIG_FILE"
echo "" >> "$CONFIG_FILE"

# Get all secrets and format as xcconfig
doppler secrets download --no-file --format=json | \
    jq -r 'to_entries | .[] | "\(.key) = \(.value)"' >> "$CONFIG_FILE"

echo "✅ Config.local.xcconfig generated successfully"
echo "📍 Location: $CONFIG_FILE"
echo ""
echo "Next steps:"
echo "1. Open Xcode"
echo "2. Select your project (top level, not target)"
echo "3. Go to Info tab → Configurations"
echo "4. Set both Debug and Release to use Config.local"