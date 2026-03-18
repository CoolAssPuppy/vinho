#!/bin/bash
# Syncs API keys from Doppler into supabase/.env.local for local edge function development.
# The local service role key is hardcoded (standard Supabase demo key).
# Run this whenever you rotate keys in Doppler.

set -euo pipefail

LOCAL_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
ENV_FILE="$(dirname "$0")/../supabase/.env.local"

doppler run -p vinho -c dev -- bash -c "cat > $ENV_FILE << EOF
OPENAI_API_KEY=\$OPENAI_API_KEY
JINA_API_KEY=\$JINA_API_KEY
VINHO_SERVICE_ROLE_KEY=$LOCAL_SERVICE_ROLE_KEY
VINHO_LOCAL_DEV=true
RESEND_API_KEY=\$RESEND_API_KEY
RESEND_FROM_EMAIL=\$RESEND_FROM_EMAIL
EOF"

echo "Synced supabase/.env.local from Doppler ($(wc -l < "$ENV_FILE") keys)"
echo "  API keys: from Doppler vinho/dev"
echo "  Service role key: local Supabase demo key"
