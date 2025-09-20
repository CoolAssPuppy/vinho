# Vinho API Documentation

## Overview

Vinho uses a combination of Server Actions (Next.js), RPC functions (Supabase), and Edge Functions for its API layer. All mutations go through Server Actions with Zod validation. Read operations use Supabase client queries or RPC functions.

## Server Actions

### Tastings

#### createTasting

Create a new wine tasting record.

```typescript
// Input schema
{
  vintageId: string (uuid)
  verdict: 'liked' | 'disliked'
  notes?: string
  tastedAt?: string (ISO date)
}

// Returns
{
  success: boolean
  data?: {
    id: string
    createdAt: string
  }
  error?: {
    code: string
    message: string
  }
}

// Usage
import { createTasting } from '@/app/actions/tastings'

const result = await createTasting({
  vintageId: '123e4567-e89b-12d3-a456-426614174000',
  verdict: 'liked',
  notes: 'Excellent balance, notes of cherry and oak'
})
```

#### updateTasting

Update an existing tasting.

```typescript
// Input schema
{
  id: string (uuid)
  verdict?: 'liked' | 'disliked'
  notes?: string
  tastedAt?: string (ISO date)
}

// Returns
{
  success: boolean
  data?: {
    id: string
    updatedAt: string
  }
  error?: {
    code: string
    message: string
  }
}
```

#### deleteTasting

Delete a tasting record.

```typescript
// Input schema
{
  id: string (uuid)
}

// Returns
{
  success: boolean
  error?: {
    code: string
    message: string
  }
}
```

### Scans

#### createScan

Process a wine label scan.

```typescript
// Input schema
{
  imageBase64: string
  coordinates?: {
    latitude: number
    longitude: number
  }
}

// Returns
{
  success: boolean
  data?: {
    scanId: string
    matches: Array<{
      vintageId: string
      wineName: string
      producerName: string
      year: number
      confidence: number
    }>
  }
  error?: {
    code: string
    message: string
  }
}
```

#### confirmScanMatch

Confirm a wine match from scan results.

```typescript
// Input schema
{
  scanId: string (uuid)
  vintageId: string (uuid)
  verdict: 'liked' | 'disliked'
}

// Returns
{
  success: boolean
  data?: {
    tastingId: string
  }
  error?: {
    code: string
    message: string
  }
}
```

### Wine Lists

#### processWineList

Process a wine list from photo or URL.

```typescript
// Input schema
{
  sourceType: 'photo' | 'url' | 'pdf'
  sourceData: string // base64 for photo/pdf, URL string for url
  restaurantName?: string
  restaurantUrl?: string
}

// Returns
{
  success: boolean
  data?: {
    wineListId: string
    items: Array<{
      id: string
      rawText: string
      wineName?: string
      vintage?: number
      price?: number
      confidence: number
      recommendation?: {
        score: number
        reason: string
      }
    }>
  }
  error?: {
    code: string
    message: string
  }
}
```

### User Preferences

#### updatePreferences

Update user wine preferences.

```typescript
// Input schema
{
  favoriteVarietals?: string[]
  favoriteSoils?: string[]
  favoriteClimates?: string[]
  priceRange?: {
    min: number
    max: number
  }
}

// Returns
{
  success: boolean
  error?: {
    code: string
    message: string
  }
}
```

### Data Export

#### exportUserData

Export user data in various formats.

```typescript
// Input schema
{
  format: 'csv' | 'json' | 'geojson'
  includePhotos?: boolean
}

// Returns
{
  success: boolean
  data?: {
    downloadUrl: string
    expiresAt: string
  }
  error?: {
    code: string
    message: string
  }
}
```

## RPC Functions

### recommend_vintages

Get personalized wine recommendations.

```sql
-- Function signature
recommend_vintages(
  p_limit integer DEFAULT 12
) RETURNS TABLE(
  vintage_id uuid,
  wine_name text,
  producer_name text,
  year integer,
  score numeric,
  reason text
)

-- Usage from TypeScript
const { data, error } = await supabase
  .rpc('recommend_vintages', { p_limit: 20 })
```

### user_tastings_geojson

Get user tastings as GeoJSON for map display.

```sql
-- Function signature
user_tastings_geojson() RETURNS jsonb

-- Returns GeoJSON FeatureCollection
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "properties": {
        "id": "uuid",
        "wineName": "Pinot Noir",
        "producerName": "Example Winery",
        "year": 2019,
        "verdict": "liked",
        "tastedAt": "2024-01-15",
        "notes": "Great balance"
      }
    }
  ]
}

-- Usage from TypeScript
const { data, error } = await supabase
  .rpc('user_tastings_geojson')
```

### find_similar_wines

Find wines similar to a given wine.

```sql
-- Function signature
find_similar_wines(
  p_vintage_id uuid,
  p_limit integer DEFAULT 10
) RETURNS TABLE(
  vintage_id uuid,
  wine_name text,
  similarity_score numeric
)

-- Usage
const { data, error } = await supabase
  .rpc('find_similar_wines', {
    p_vintage_id: '123e4567-e89b-12d3-a456-426614174000',
    p_limit: 5
  })
```

### search_wines

Full-text and fuzzy search for wines.

```sql
-- Function signature
search_wines(
  p_query text,
  p_limit integer DEFAULT 20
) RETURNS TABLE(
  wine_id uuid,
  wine_name text,
  producer_name text,
  rank numeric
)

-- Usage
const { data, error } = await supabase
  .rpc('search_wines', {
    p_query: 'pinot noir napa',
    p_limit: 10
  })
```

## Edge Functions

### /functions/ocr-winelist

Extract text from wine list images.

```typescript
// POST /functions/ocr-winelist
// Headers: Authorization: Bearer <anon_key>

// Request
{
  imagePath: string,      // Storage path to image
  restaurant?: string     // Optional restaurant context
}

// Response
{
  success: boolean,
  data?: {
    wineListId: string,
    rawText: string,
    items: Array<{
      line: number,
      text: string,
      parsed?: {
        wine: string,
        vintage?: number,
        price?: number,
        region?: string,
        varietal?: string
      },
      confidence: number
    }>
  },
  error?: {
    code: string,
    message: string
  }
}
```

### /functions/crawl-winery

Extract winery information from websites.

```typescript
// POST /functions/crawl-winery
// Headers: Authorization: Bearer <anon_key>

// Request
{
  url: string              // Winery website URL
}

// Response
{
  success: boolean,
  data?: {
    name: string,
    location?: {
      latitude: number,
      longitude: number,
      address?: string
    },
    metadata?: {
      description?: string,
      established?: number,
      varietals?: string[],
      website: string
    }
  },
  error?: {
    code: string,
    message: string
  }
}
```

## Authentication

All API calls require authentication via Supabase Auth.

### Headers

```typescript
// Web (Server Actions handle automatically)
// Cookies: sb-access-token, sb-refresh-token

// iOS
{
  'Authorization': 'Bearer <access_token>'
}

// Edge Functions
{
  'Authorization': 'Bearer <anon_key>'
}
```

### Error Responses

All APIs return consistent error shapes:

```typescript
interface ApiError {
  code: string; // Machine-readable error code
  message: string; // Human-readable message
  details?: unknown; // Additional error context
}

// Common error codes
("AUTH_REQUIRED"); // No valid session
("PERMISSION_DENIED"); // RLS policy violation
("NOT_FOUND"); // Resource not found
("VALIDATION_ERROR"); // Input validation failed
("RATE_LIMITED"); // Too many requests
("SERVER_ERROR"); // Internal server error
```

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Search endpoints: 30 requests per minute
- Export endpoints: 5 requests per hour
- Edge Functions: 100 requests per minute

## Pagination

List endpoints support pagination:

```typescript
// Query parameters
{
  page: number,      // Page number (1-based)
  limit: number,     // Items per page (max 100)
  sort?: string,     // Sort field
  order?: 'asc' | 'desc'
}

// Response includes
{
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

## Webhooks

Supabase Database Webhooks for real-time events:

```typescript
// Webhook payload
{
  type: 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  record: Record<string, unknown>,
  old_record?: Record<string, unknown>,
  schema: string,
  timestamp: string
}

// Subscribed events
- tastings.INSERT -> Update preference vector
- tastings.UPDATE -> Recalculate recommendations
- photos.INSERT -> Process for thumbnails
```

## Testing

### Test User Accounts

Development environment includes seeded test users:

- `test@vinho.app` / `password123` - Basic user with sample data
- `premium@vinho.app` / `password123` - Premium user with extensive history

### Mock Endpoints

Edge Functions support mock mode via header:

```typescript
{
  'X-Mock-Mode': 'true'
}
```

### Rate Limit Bypass

Development environment allows rate limit bypass:

```typescript
{
  'X-Dev-Token': process.env.DEV_TOKEN
}
```
