# Doppler Secrets Management for Vinho

## Overview

Vinho uses Doppler for centralized secrets management across all environments (development, staging, production).

## Initial Setup

### 1. Install Doppler CLI

```bash
# macOS
brew install dopplerhq/cli/doppler

# Linux
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh

# Or use our setup script
./scripts/setup-doppler.sh
```

### 2. Authenticate

```bash
doppler login
```

### 3. Configure Project

```bash
doppler setup --project vinho --config dev
```

## Required Secrets

Add these secrets in the [Doppler Dashboard](https://dashboard.doppler.com):

### Core Secrets

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

### Additional Production Secrets

- `DATABASE_URL` - Direct PostgreSQL connection string
- `EDGE_FUNCTION_URL` - Edge function endpoint for OCR
- `SENTRY_DSN` - Error tracking (optional)
- `GOOGLE_OAUTH_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_OAUTH_CLIENT_SECRET` - Google OAuth client secret

## Environment Configuration

### Development

```bash
doppler setup --project vinho --config dev
npm run dev:doppler
```

### Staging

```bash
doppler setup --project vinho --config stg
npm run build:doppler
```

### Production

```bash
doppler setup --project vinho --config prd
npm run build:doppler
npm run start:doppler
```

## Vercel Integration

### Automatic Deployment with Doppler

1. Install Doppler Vercel Integration:
   - Go to [Doppler Integrations](https://dashboard.doppler.com/workplace/integrations)
   - Add Vercel integration
   - Select the `vinho` project

2. Configure environments:
   - Map `dev` config → Preview deployments
   - Map `prd` config → Production deployment

3. Secrets will automatically sync to Vercel when updated in Doppler

### Manual Vercel Setup

If not using the integration, add these to Vercel:

```bash
# Pull secrets from Doppler
doppler secrets download --no-file --format env > .env.production

# Then manually add to Vercel dashboard
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install Doppler CLI
  uses: dopplerhq/cli-action@v1

- name: Run tests with Doppler secrets
  run: doppler run --config test -- npm test
  env:
    DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
```

## Local Development Without Doppler

If you prefer not to use Doppler locally:

1. Copy `.env.local.example` to `.env.local`
2. Fill in your values
3. Run `npm run dev` (without `:doppler`)

## Security Best Practices

1. **Never commit secrets** - All `.env` files are gitignored
2. **Use service tokens in CI/CD** - Not personal tokens
3. **Rotate secrets regularly** - Doppler makes this easy
4. **Use least privilege** - Different keys for different environments
5. **Enable audit logs** - Track who accessed what

## Troubleshooting

### Can't connect to Doppler

```bash
# Verify authentication
doppler me

# Re-authenticate if needed
doppler login
```

### Secrets not loading

```bash
# Check current config
doppler configure

# Verify secrets exist
doppler secrets
```

### Environment mismatch

```bash
# Switch environments
doppler setup --project vinho --config [dev|stg|prd]
```

## Commands Reference

```bash
# View all secrets (masked)
doppler secrets

# Get specific secret
doppler secrets get NEXT_PUBLIC_SUPABASE_URL

# Run any command with secrets
doppler run -- [command]

# Download secrets as env file
doppler secrets download --no-file --format env

# Open dashboard
doppler open
```
