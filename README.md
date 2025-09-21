# Vinho 🍷

Cloud-only Supabase monorepo for a terroir-first, privacy-respecting wine journal and recommender.

## Overview

Vinho is a wine education platform that focuses on teaching users about wine through geography, history, and terroir rather than commerce. Built with Next.js, Supabase, and SwiftUI.

## Tech Stack

- **Web**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Mobile**: SwiftUI (iOS 17+), MapKit
- **Secrets**: Doppler for environment management
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account
- Doppler account (for secrets management)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/vinho.git
cd vinho

# Install dependencies
pnpm install

# Setup Doppler for secrets
./scripts/setup-doppler.sh

# Run development server
npm run dev:doppler
```

### Environment Variables

#### Using Doppler (Recommended)

We use Doppler for centralized secrets management:

```bash
# Setup Doppler
doppler setup --project vinho --config dev

# Run with Doppler
npm run dev:doppler
```

See [Doppler Setup Guide](docs/DOPPLER_SETUP.md) for complete instructions.

#### Manual Setup

If not using Doppler, copy `.env.local.example` to `.env.local`:

```bash
cp apps/vinho-web/.env.local.example apps/vinho-web/.env.local
# Edit with your Supabase credentials
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Development

```bash
# Web development
cd apps/vinho-web
npm run dev:doppler

# Run tests
npm test

# Type checking
npm run typecheck

# Build for production
npm run build:doppler
```

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Install Doppler integration in Vercel
3. Map Doppler configs:
   - `dev` → Preview deployments
   - `prd` → Production
4. Deploy!

## Project Structure

```
vinho/
├── apps/
│   ├── vinho-web/        # Next.js web application
│   └── VinhoApp/         # iOS application (SwiftUI)
├── packages/
│   └── db-types/         # Shared TypeScript types
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge Functions
└── docs/                 # Documentation
```

## Features

- 🍷 Wine label scanning with OCR
- 🗺️ Interactive wine region exploration
- 📖 Personal tasting journal
- 🎓 Wine education through terroir
- 🔍 Smart wine recommendations
- 📋 Restaurant wine list parsing
- 🔐 Privacy-first design

## Documentation

- [Technical Specification](docs/SPEC.md)
- [Development Conventions](docs/CONVENTIONS.md)
- [Doppler Setup](docs/DOPPLER_SETUP.md)
- [API Documentation](docs/API.md)
- [Operations Guide](docs/OPERATIONS.md)

## License

Private - All rights reserved
