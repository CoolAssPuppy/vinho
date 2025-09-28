#!/bin/bash
# Doppler secrets fetcher for Xcode builds

set -e

# Check if Doppler CLI is installed
if ! command -v doppler &> /dev/null; then
    echo "Warning: Doppler CLI is not installed. Install it with: brew install dopplerhq/cli/doppler"
    echo "Skipping Doppler secrets fetch. App will use fallback values."
    exit 0
fi

# Handle both Xcode build context and manual runs
if [ -n "$SRCROOT" ]; then
    # Running from Xcode
    PROJECT_ROOT="${SRCROOT}/../.."
    SECRETS_PLIST="${SRCROOT}/Vinho/DopplerSecrets.plist"
else
    # Running manually
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
    SECRETS_PLIST="$SCRIPT_DIR/../Vinho/DopplerSecrets.plist"
fi

cd "$PROJECT_ROOT"

# Determine environment based on build configuration
if [ "${CONFIGURATION}" == "Release" ]; then
    DOPPLER_CONFIG="prd"
elif [ "${CONFIGURATION}" == "Debug" ]; then
    DOPPLER_CONFIG="dev"
else
    DOPPLER_CONFIG="dev"
fi

echo "Using Doppler config: ${DOPPLER_CONFIG}"
echo "Project root: ${PROJECT_ROOT}"
echo "Secrets file: ${SECRETS_PLIST}"

# Fetch secrets from Doppler and create a plist
echo "Fetching secrets from Doppler..."
doppler secrets download \
    --no-file \
    --format json \
    --config "${DOPPLER_CONFIG}" | \
    /usr/bin/python3 -c "
import json
import sys
import plistlib
import os

# Read JSON from stdin
data = json.load(sys.stdin)

# Ensure the directory exists
plist_path = '${SECRETS_PLIST}'
os.makedirs(os.path.dirname(plist_path), exist_ok=True)

# Convert to plist format
with open(plist_path, 'wb') as f:
    plistlib.dump(data, f)

print(f'Successfully created {len(data)} secrets in plist at {plist_path}')
"

echo "Doppler secrets fetched successfully"