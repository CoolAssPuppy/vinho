# Vinho Technical Specification

## Database Schema

### Reference Tables

#### climate_zones
Stores Köppen climate classification data.
```sql
CREATE TABLE climate_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  koppen VARCHAR(10) NOT NULL,
  notes TEXT
);
```

#### soil_types
Catalog of vineyard soil types.
```sql
CREATE TABLE soil_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);
```

#### grape_varietals
Wine grape varieties with genetic relationships.
```sql
CREATE TABLE grape_varietals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  parent_a INTEGER REFERENCES grape_varietals(id),
  parent_b INTEGER REFERENCES grape_varietals(id)
);
```

#### regions
Geographic wine regions with boundaries.
```sql
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  country VARCHAR(100) NOT NULL,
  geom GEOGRAPHY(MULTIPOLYGON, 4326),
  climate_zone_id INTEGER REFERENCES climate_zones(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Producer Tables

#### producers
Wine producers and wineries.
```sql
CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  website VARCHAR(500),
  location GEOGRAPHY(POINT, 4326),
  region_id UUID REFERENCES regions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### vineyards
Individual vineyard blocks with geographic data.
```sql
CREATE TABLE vineyards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
  block_name VARCHAR(100),
  location GEOGRAPHY(POLYGON, 4326),
  centroid GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_Centroid(location::geometry)::geography) STORED,
  soil_type_id INTEGER REFERENCES soil_types(id),
  region_id UUID REFERENCES regions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Wine Tables

#### wines
Base wine products.
```sql
CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
  is_nv BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### vintages
Specific vintage years of wines.
```sql
CREATE TABLE vintages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE,
  year INTEGER CHECK (year >= 1800 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
  abv NUMERIC(4,1) CHECK (abv >= 0 AND abv <= 30),
  vineyard_id UUID REFERENCES vineyards(id),
  climate_zone_id INTEGER REFERENCES climate_zones(id),
  soil_type_id INTEGER REFERENCES soil_types(id),
  varietal_vector VECTOR(256),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wine_id, year)
);
```

#### wine_varietals
Many-to-many relationship for vintage grape composition.
```sql
CREATE TABLE wine_varietals (
  vintage_id UUID REFERENCES vintages(id) ON DELETE CASCADE,
  varietal_id INTEGER REFERENCES grape_varietals(id),
  percent NUMERIC(5,2) CHECK (percent > 0 AND percent <= 100),
  PRIMARY KEY (vintage_id, varietal_id)
);
```

### User Data Tables

#### tastings
User wine tastings with verdicts.
```sql
CREATE TABLE tastings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vintage_id UUID REFERENCES vintages(id),
  verdict SMALLINT CHECK (verdict IN (-1, 1)),
  notes TEXT,
  tasted_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### photos
User-uploaded photos linked to tastings.
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tasting_id UUID REFERENCES tastings(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### scans
Wine label scans with OCR results.
```sql
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  ocr_text TEXT,
  matched_vintage_id UUID REFERENCES vintages(id),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Wine List Tables

#### wine_lists
Restaurant wine lists from various sources.
```sql
CREATE TABLE wine_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(20) CHECK (source_type IN ('photo', 'url', 'pdf')),
  source_url TEXT,
  restaurant_name VARCHAR(300),
  restaurant_url VARCHAR(500),
  parsed_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### wine_list_items
Individual wines extracted from lists.
```sql
CREATE TABLE wine_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_list_id UUID REFERENCES wine_lists(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  guessed_wine_id UUID REFERENCES wines(id),
  guessed_vintage_year INTEGER,
  price_cents INTEGER CHECK (price_cents >= 0),
  country VARCHAR(100),
  region VARCHAR(200),
  varietal VARCHAR(100),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### restaurant_favorites
User's saved restaurants.
```sql
CREATE TABLE restaurant_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name VARCHAR(300) NOT NULL,
  url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_name)
);
```

## RLS Policies

### User Data Protection
All user-specific tables enforce row-level security:

```sql
-- Tastings
ALTER TABLE tastings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tastings" ON tastings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tastings" ON tastings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tastings" ON tastings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tastings" ON tastings
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for photos, scans, restaurant_favorites
```

### Public Data Access
Reference tables are readable by all authenticated users:

```sql
CREATE POLICY "Public read access" ON climate_zones
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON soil_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON grape_varietals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON regions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON producers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON vineyards
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON wines
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON vintages
  FOR SELECT USING (auth.uid() IS NOT NULL);
```

## Indexes

### Geography Indexes
```sql
CREATE INDEX idx_regions_geom ON regions USING GIST (geom);
CREATE INDEX idx_producers_location ON producers USING GIST (location);
CREATE INDEX idx_vineyards_location ON vineyards USING GIST (location);
CREATE INDEX idx_vineyards_centroid ON vineyards USING GIST (centroid);
```

### Search Indexes
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_wines_name_trgm ON wines USING GIN (name gin_trgm_ops);
CREATE INDEX idx_producers_name_trgm ON producers USING GIN (name gin_trgm_ops);
CREATE INDEX idx_grape_varietals_name_trgm ON grape_varietals USING GIN (name gin_trgm_ops);
CREATE INDEX idx_regions_name_trgm ON regions USING GIN (name gin_trgm_ops);
```

### Query Performance Indexes
```sql
CREATE INDEX idx_tastings_user_date ON tastings(user_id, tasted_at DESC);
CREATE INDEX idx_tastings_user_vintage ON tastings(user_id, vintage_id);
CREATE INDEX idx_tastings_verdict ON tastings(verdict) WHERE verdict IS NOT NULL;
CREATE INDEX idx_vintages_wine_year ON vintages(wine_id, year DESC);
CREATE INDEX idx_photos_tasting ON photos(tasting_id);
CREATE INDEX idx_wine_list_items_list ON wine_list_items(wine_list_id);
```

### Vector Index
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX idx_vintages_vector ON vintages USING ivfflat (varietal_vector vector_cosine_ops);
```

## RPC Functions

### recommend_vintages
Personalized wine recommendations based on taste history.

```sql
CREATE OR REPLACE FUNCTION recommend_vintages(p_limit INTEGER DEFAULT 12)
RETURNS TABLE(
  vintage_id UUID,
  wine_name TEXT,
  producer_name TEXT,
  year INTEGER,
  score NUMERIC,
  reason TEXT
) AS $$
DECLARE
  user_vector VECTOR(256);
BEGIN
  -- Get user preference vector from view
  SELECT pref_vector INTO user_vector
  FROM user_preference_vectors
  WHERE user_id = auth.uid();

  IF user_vector IS NULL THEN
    RETURN QUERY
    SELECT
      v.id,
      w.name,
      p.name,
      v.year,
      0.5::NUMERIC,
      'Popular wine'::TEXT
    FROM vintages v
    JOIN wines w ON w.id = v.wine_id
    JOIN producers p ON p.id = w.producer_id
    ORDER BY RANDOM()
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    WITH similar AS (
      SELECT
        v.id,
        w.name AS wine_name,
        p.name AS producer_name,
        v.year,
        1 - (v.varietal_vector <=> user_vector) AS similarity
      FROM vintages v
      JOIN wines w ON w.id = v.wine_id
      JOIN producers p ON p.id = w.producer_id
      WHERE v.varietal_vector IS NOT NULL
        AND v.id NOT IN (
          SELECT vintage_id FROM tastings
          WHERE user_id = auth.uid()
        )
      ORDER BY v.varietal_vector <=> user_vector
      LIMIT p_limit * 3
    )
    SELECT
      id,
      wine_name,
      producer_name,
      year,
      similarity::NUMERIC,
      CASE
        WHEN similarity > 0.9 THEN 'Perfect match'
        WHEN similarity > 0.8 THEN 'Excellent match'
        WHEN similarity > 0.7 THEN 'Very good match'
        ELSE 'Good match'
      END AS reason
    FROM similar
    ORDER BY similarity DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### user_tastings_geojson
Export user tastings as GeoJSON for map display.

```sql
CREATE OR REPLACE FUNCTION user_tastings_geojson()
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(COALESCE(vy.centroid, p.location))::jsonb,
        'properties', jsonb_build_object(
          'id', t.id,
          'wineName', w.name,
          'producerName', p.name,
          'year', v.year,
          'verdict', CASE t.verdict
            WHEN 1 THEN 'liked'
            WHEN -1 THEN 'disliked'
            ELSE NULL
          END,
          'tastedAt', t.tasted_at,
          'notes', t.notes
        )
      )
    ), '[]'::jsonb)
  )
  FROM tastings t
  JOIN vintages v ON v.id = t.vintage_id
  JOIN wines w ON w.id = v.wine_id
  JOIN producers p ON p.id = w.producer_id
  LEFT JOIN vineyards vy ON vy.id = v.vineyard_id
  WHERE t.user_id = auth.uid()
    AND (vy.centroid IS NOT NULL OR p.location IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### upsert_scan_match
Process OCR scan and create tentative wine match.

```sql
CREATE OR REPLACE FUNCTION upsert_scan_match(payload JSONB)
RETURNS UUID AS $$
DECLARE
  scan_id UUID;
  matched_id UUID;
BEGIN
  -- Extract matched vintage
  matched_id := (payload->>'matched_vintage_id')::UUID;

  -- Insert or update scan
  INSERT INTO scans (
    user_id,
    image_path,
    ocr_text,
    matched_vintage_id,
    confidence
  ) VALUES (
    auth.uid(),
    payload->>'image_path',
    payload->>'ocr_text',
    matched_id,
    COALESCE((payload->>'confidence')::NUMERIC, 0.5)
  )
  RETURNING id INTO scan_id;

  -- Auto-create tasting if high confidence
  IF (payload->>'confidence')::NUMERIC > 0.8 AND matched_id IS NOT NULL THEN
    INSERT INTO tastings (user_id, vintage_id)
    VALUES (auth.uid(), matched_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Views

### user_preference_vectors
Calculates user taste preferences from tasting history.

```sql
CREATE MATERIALIZED VIEW user_preference_vectors AS
WITH user_vectors AS (
  SELECT
    t.user_id,
    AVG(CASE WHEN t.verdict = 1 THEN v.varietal_vector END) AS liked_vector,
    AVG(CASE WHEN t.verdict = -1 THEN v.varietal_vector END) AS disliked_vector
  FROM tastings t
  JOIN vintages v ON v.id = t.vintage_id
  WHERE v.varietal_vector IS NOT NULL
  GROUP BY t.user_id
)
SELECT
  user_id,
  COALESCE(liked_vector, ARRAY_FILL(0.5, ARRAY[256])::vector) -
  COALESCE(disliked_vector, ARRAY_FILL(0, ARRAY[256])::vector) AS pref_vector
FROM user_vectors;

CREATE UNIQUE INDEX ON user_preference_vectors(user_id);

-- Refresh trigger
CREATE OR REPLACE FUNCTION refresh_preference_vectors()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_preference_vectors;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_preferences
AFTER INSERT OR UPDATE OR DELETE ON tastings
FOR EACH STATEMENT EXECUTE FUNCTION refresh_preference_vectors();
```

## Server Action Contracts

### createTasting
```typescript
const CreateTastingSchema = z.object({
  vintageId: z.string().uuid(),
  verdict: z.enum(['liked', 'disliked']),
  notes: z.string().max(5000).optional(),
  tastedAt: z.string().datetime().optional()
})

type CreateTastingInput = z.infer<typeof CreateTastingSchema>
```

### processWineList
```typescript
const ProcessWineListSchema = z.object({
  sourceType: z.enum(['photo', 'url', 'pdf']),
  sourceData: z.string(),
  restaurantName: z.string().max(300).optional(),
  restaurantUrl: z.string().url().optional()
})

type ProcessWineListInput = z.infer<typeof ProcessWineListSchema>
```

### exportUserData
```typescript
const ExportUserDataSchema = z.object({
  format: z.enum(['csv', 'json', 'geojson']),
  includePhotos: z.boolean().optional()
})

type ExportUserDataInput = z.infer<typeof ExportUserDataSchema>
```

## Edge Function Contracts

### ocr-winelist
**Endpoint:** POST /functions/ocr-winelist

**Request:**
```typescript
interface OcrWineListRequest {
  imagePath: string
  restaurant?: string
}
```

**Response:**
```typescript
interface OcrWineListResponse {
  success: boolean
  data?: {
    wineListId: string
    rawText: string
    items: Array<{
      line: number
      text: string
      parsed?: {
        wine: string
        vintage?: number
        price?: number
        region?: string
        varietal?: string
      }
      confidence: number
    }>
  }
  error?: {
    code: string
    message: string
  }
}
```

### crawl-winery
**Endpoint:** POST /functions/crawl-winery

**Request:**
```typescript
interface CrawlWineryRequest {
  url: string
}
```

**Response:**
```typescript
interface CrawlWineryResponse {
  success: boolean
  data?: {
    name: string
    location?: {
      latitude: number
      longitude: number
      address?: string
    }
    metadata?: {
      description?: string
      established?: number
      varietals?: string[]
      website: string
    }
  }
  error?: {
    code: string
    message: string
  }
}
```

## iOS Architecture

### Module Structure
```
Vinho/
├── App/
│   ├── VinoApp.swift
│   ├── AppDelegate.swift
│   └── Info.plist
├── Features/
│   ├── Scan/
│   │   ├── ScanView.swift
│   │   ├── ScanViewModel.swift
│   │   └── VisionProcessor.swift
│   ├── Map/
│   │   ├── MapView.swift
│   │   ├── MapViewModel.swift
│   │   └── ClusterAnnotation.swift
│   ├── Journal/
│   │   ├── JournalView.swift
│   │   ├── JournalViewModel.swift
│   │   └── TastingRow.swift
│   ├── Recommend/
│   │   ├── RecommendView.swift
│   │   └── RecommendViewModel.swift
│   └── Settings/
│       ├── SettingsView.swift
│       └── ExportViewModel.swift
├── Services/
│   ├── SupabaseService.swift
│   ├── OfflineQueue.swift
│   ├── LocationService.swift
│   └── HapticService.swift
├── Models/
│   ├── Wine.swift
│   ├── Tasting.swift
│   ├── Producer.swift
│   └── Vintage.swift
└── Utils/
    ├── Extensions/
    ├── Constants.swift
    └── Theme.swift
```

### Service Contracts

#### SupabaseService
```swift
protocol SupabaseServiceProtocol {
    func signIn(email: String, password: String) async throws -> User
    func signOut() async throws
    func createTasting(_ tasting: Tasting) async throws -> Tasting
    func fetchTastings() async throws -> [Tasting]
    func recommendWines(limit: Int) async throws -> [Recommendation]
    func uploadPhoto(_ data: Data, tastingId: UUID) async throws -> URL
}
```

#### OfflineQueue
```swift
protocol OfflineQueueProtocol {
    func enqueue<T: Codable>(_ operation: Operation<T>)
    func processQueue() async
    func clearQueue()
    var pendingOperations: [any Operation] { get }
}

struct Operation<T: Codable>: Codable {
    let id: UUID
    let type: OperationType
    let payload: T
    let timestamp: Date
    let retryCount: Int
}

enum OperationType: String, Codable {
    case createTasting
    case updateTasting
    case deleteTasting
    case uploadPhoto
}
```

## Test Strategy

### Unit Tests
- **Coverage Goal:** 80% for business logic
- **Tools:** Vitest (Web), XCTest (iOS)
- **Focus:** Pure functions, data transformations, validators

### Integration Tests
- **Coverage Goal:** Critical user paths
- **Tools:** Testing Library (Web), XCTest (iOS)
- **Focus:** API interactions, database operations, auth flows

### E2E Tests
- **Coverage Goal:** Happy paths + key error states
- **Tools:** Playwright (Web), XCUITest (iOS)
- **Scenarios:**
  - Sign up and sign in
  - Scan wine and rate
  - View map with filters
  - Get recommendations
  - Export data

### RLS Tests
```typescript
describe('RLS Policies', () => {
  it('prevents user A from reading user B tastings', async () => {
    const userA = await createTestUser()
    const userB = await createTestUser()

    const tastingB = await createTasting(userB, { vintageId: 'xxx' })

    const client = createClient(userA)
    const result = await client
      .from('tastings')
      .select()
      .eq('id', tastingB.id)

    expect(result.data).toHaveLength(0)
  })
})
```

## CI/CD Pipelines

### Web Pipeline (.github/workflows/ci-web.yml)
```yaml
name: CI Web
on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'apps/vinho-web/**'
      - 'packages/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run supa:types
      - run: pnpm -w build
      - run: pnpm -w test
      - run: pnpm -w lint
      - run: pnpm -w typecheck
```

### SQL Pipeline (.github/workflows/ci-sql.yml)
```yaml
name: CI SQL
on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'supabase/migrations/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase db lint
      - run: supabase db push --dry-run
```

### iOS Pipeline (.github/workflows/ci-ios.yml)
```yaml
name: CI iOS
on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'apps/vinho-ios/**'

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: '15.0'
      - run: |
          cd apps/vinho-ios
          xcodebuild test \
            -scheme Vinho \
            -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Deployment

### Vercel Configuration
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm -w build",
  "outputDirectory": "apps/vinho-web/.next",
  "installCommand": "pnpm install --frozen-lockfile",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### iOS Release Process
1. Increment version in Info.plist
2. Archive build with Xcode
3. Upload to App Store Connect
4. Submit for TestFlight review
5. Release to external testers
6. Submit for App Store review
7. Release to App Store

### Database Migration Process
1. Create migration file in `supabase/migrations/`
2. Test locally with `supabase db push --dry-run`
3. Apply to preview branch
4. Run integration tests
5. Merge to main
6. Apply to production with `supabase db push`
7. Generate types with `pnpm run supa:types`
8. Dump schema with `pnpm run supa:dump`