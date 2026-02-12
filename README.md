# Vinho

Cloud-only Supabase monorepo for a terroir-first, privacy-respecting wine journal and recommender.

## Overview

Vinho is a wine education platform that focuses on teaching users about wine through geography, history, and terroir rather than commerce. Built with Next.js, Supabase, SwiftUI, and Jetpack Compose.

## Tech Stack

- **Web**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **iOS**: SwiftUI (iOS 17+), MapKit
- **Android**: Kotlin, Jetpack Compose, Material 3
- **Secrets**: Doppler for environment management
- **Deployment**: Vercel (web), App Store (iOS), Play Store (Android)

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
│   ├── vinho-ios/        # iOS application (SwiftUI)
│   └── vinho-android/    # Android application (Jetpack Compose)
├── supabase/
│   ├── migrations/       # Database migrations
│   ├── functions/        # Edge Functions
│   ├── seeds/            # Seed data (regions, varietals, etc.)
│   └── auth-emails/      # Custom auth email templates
├── scripts/              # Development and deployment scripts
└── docs/                 # Documentation
```

## Features

- Wine label scanning with OCR
- Interactive wine region exploration
- Personal tasting journal
- Wine education through terroir
- Smart wine recommendations
- Restaurant wine list parsing
- Privacy-first design

## Image processing pipeline

When a user scans a wine label, Vinho runs a multi-step pipeline that identifies the wine, creates database records, and builds a searchable index for future scans. The pipeline is designed to get faster and cheaper over time as the database grows.

### 1. Image capture and compression

Images are compressed on the client before upload to reduce bandwidth and speed up processing.

- **Web** (`apps/vinho-web/app/scan/page.tsx`): Uses a client-side canvas to resize the image to a maximum of 2000px on the longest side, then exports as JPEG at 0.8 quality.
- **iOS** (`apps/vinho-ios/Vinho/Views/Scanner/ScannerView.swift`): Uses `jpegData(compressionQuality: 0.5)` for a more aggressive compression suited to mobile upload speeds.

### 2. Upload and queue

The compressed image is uploaded to Supabase Storage in the `scans` bucket under a path like `{user_id}/{timestamp}.jpg`. The client then inserts a row into the `scans` table and a corresponding row into the `wines_added_queue` table with status `pending`. Finally, the client invokes the `process-wine-queue` edge function to begin processing.

### 3. Core processing (`process-wine-queue`)

The `process-wine-queue` edge function (`supabase/functions/process-wine-queue/index.ts`) claims pending jobs atomically and processes them through a sequential matching strategy. Each step is tried in order, and the pipeline short-circuits as soon as a match is found.

**Step 1: Visual embedding match (fastest path)**
- Generates a 768-dimensional image embedding using Jina CLIP v1.
- Searches the `wine-labels` vector bucket for similar label images.
- Requires 92% or higher cosine similarity to accept a match.
- If matched, skips all remaining steps and creates a tasting record immediately.

**Step 2: Text vector match (free path)**
- Generates a 384-dimensional text embedding from OCR text using the built-in Supabase gte-small model.
- Searches the `wine_embeddings` table via pgvector using the `match_wine_by_identity` RPC.
- Requires 90% or higher similarity and at least 50% data completeness.
- If matched, skips OpenAI extraction entirely, saving API costs.

**Step 3: OpenAI Vision extraction**
- Sends the image and any OCR text to GPT-4o-mini for structured data extraction (producer, wine name, year, region, country, varietals, ABV, producer location).
- If confidence is below 60%, escalates to GPT-4o for a second attempt.

**Step 4: Post-extraction vector match**
- Runs the text vector match again, this time using the richer extracted data instead of raw OCR text.
- This catches wines that were already in the database but did not match on OCR text alone.

**Step 5: Database record creation**
- If no match was found, creates new records in this order: region, producer (with location details), wine, vintage, and grape varietals.
- Uses upsert logic with case-insensitive matching and unique constraint handling to avoid duplicates.

**Step 6: Visual embedding storage**
- Calls the `generate-visual-embedding` edge function to store the label image embedding in the `wine-labels` vector bucket for future visual matches.
- Queues a text embedding generation job in the `embedding_jobs_queue` table.

#### Match quality ranking

| Method | Speed | Cost | Confidence threshold |
|--------|-------|------|---------------------|
| Visual embedding (Jina CLIP) | Fastest | Low (Jina API call) | 92% similarity |
| Text vector (gte-small + pgvector) | Fast | Free (runs on Supabase) | 90% similarity |
| OpenAI Vision (GPT-4o-mini/GPT-4o) | Slowest | Highest (OpenAI API call) | 60% for escalation |

### 4. Data enrichment (`process-enrichment-queue`)

After a new wine is created, a job is inserted into the `wines_enrichment_queue` table. The `process-enrichment-queue` edge function (`supabase/functions/process-enrichment-queue/index.ts`) picks up these jobs and uses GPT-4o-mini to fill in missing data from its knowledge base, including tasting notes, food pairings, aging potential, and grape varietals. Enriched data is written back to the wine and vintage records.

### 5. Visual embedding generation (`generate-visual-embedding`)

The `generate-visual-embedding` edge function (`supabase/functions/generate-visual-embedding/index.ts`) accepts an image URL and wine ID, generates a 768-dimensional embedding via the Jina CLIP v1 API, and stores it in the `wine-labels` vector bucket with metadata (wine ID, vintage ID, scan ID, producer name, wine name). It also writes to the `label_embeddings` table for backward compatibility.

### 6. Text embedding generation (`generate-embeddings`)

The `generate-embeddings` edge function (`supabase/functions/generate-embeddings/index.ts`) processes jobs from the `embedding_jobs_queue` table. It generates 384-dimensional text embeddings using the Supabase built-in gte-small model from a wine identity string formatted as `Producer | Wine Name | Region, Country | Varietals`. Embeddings are stored in the `wine_embeddings` table via pgvector, and a data completeness score is calculated based on how many identity fields are populated.

### 7. Tasting record creation

At the end of processing, a tasting record is created linking the user, the matched or newly created vintage, and the scanned image URL. The tasting date defaults to the scan timestamp. Users can add ratings and notes later through the tasting editor.

### External services

- **Jina AI**: CLIP v1 model for visual label embeddings (768 dimensions)
- **OpenAI**: GPT-4o-mini and GPT-4o for label extraction and data enrichment
- **Supabase AI**: gte-small model for text embeddings (384 dimensions, runs locally on Supabase infrastructure)
- **Supabase Storage**: Vector buckets for visual embedding search, standard buckets for image storage

### Performance timeline

For a wine that has been scanned before, the visual embedding match completes in under 2 seconds. For a wine already in the text vector index, matching takes 2 to 4 seconds. For a completely new wine requiring OpenAI extraction, enrichment, and embedding generation, the full pipeline takes 8 to 15 seconds. The client returns immediately after upload and polls for completion in the background.

## Test users

For development and testing purposes, the following test accounts are available:

| Name | Email | Purpose |
|------|-------|---------|
| Test User | testuser@strategicnerds.com | General testing and QA |

Note: Contact the project maintainer for test account credentials.

## Documentation

- [Technical Specification](docs/SPEC.md)
- [Development Conventions](docs/CONVENTIONS.md)
- [Doppler Setup](docs/DOPPLER_SETUP.md)
- [API Documentation](docs/API.md)
- [Operations Guide](docs/OPERATIONS.md)

## License

Private - All rights reserved
