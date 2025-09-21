#!/bin/bash

# Setup script for Doppler secrets management

echo "🔐 Setting up Doppler for Vinho project..."

# Check if Doppler CLI is installed
if ! command -v doppler &> /dev/null; then
    echo "❌ Doppler CLI not found. Installing..."

    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install dopplerhq/cli/doppler
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
    else
        echo "⚠️  Please install Doppler CLI manually: https://docs.doppler.com/docs/install-cli"
        exit 1
    fi
fi

echo "✅ Doppler CLI installed"

# Login to Doppler
echo "📝 Please login to Doppler..."
doppler login

# Setup the project
echo "🔧 Setting up Doppler project..."
doppler setup --project vinho --config dev

# List required secrets
echo ""
echo "📋 Required secrets for Vinho:"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY (for server-side operations)"
echo ""
echo "Add these in the Doppler dashboard: https://dashboard.doppler.com/workplace/vinho"

# Verify setup
echo ""
echo "🔍 Verifying setup..."
doppler secrets

echo ""
echo "✅ Doppler setup complete!"
echo ""
echo "📚 Usage:"
echo "  Development:  npm run dev:doppler"
echo "  Production:   npm run build:doppler"
echo "  Testing:      doppler run -- npm test"