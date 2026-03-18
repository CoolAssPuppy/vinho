-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- Reference Tables

CREATE TABLE climate_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  koppen VARCHAR(10) NOT NULL,
  notes TEXT
);

CREATE TABLE soil_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE grape_varietals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  parent_a INTEGER REFERENCES grape_varietals(id),
  parent_b INTEGER REFERENCES grape_varietals(id)
);

CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  country VARCHAR(100) NOT NULL,
  geom GEOGRAPHY(MULTIPOLYGON, 4326),
  climate_zone_id INTEGER REFERENCES climate_zones(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Producer Tables

CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  website VARCHAR(500),
  location GEOGRAPHY(POINT, 4326),
  region_id UUID REFERENCES regions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Wine Tables

CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
  is_nv BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE wine_varietals (
  vintage_id UUID REFERENCES vintages(id) ON DELETE CASCADE,
  varietal_id INTEGER REFERENCES grape_varietals(id),
  percent NUMERIC(5,2) CHECK (percent > 0 AND percent <= 100),
  PRIMARY KEY (vintage_id, varietal_id)
);

-- User Data Tables

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

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tasting_id UUID REFERENCES tastings(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  ocr_text TEXT,
  matched_vintage_id UUID REFERENCES vintages(id),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wine List Tables

CREATE TABLE wine_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(20) CHECK (source_type IN ('photo', 'url', 'pdf')),
  source_url TEXT,
  restaurant_name VARCHAR(300),
  restaurant_url VARCHAR(500),
  parsed_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE restaurant_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name VARCHAR(300) NOT NULL,
  url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_name)
);

-- Enable Row Level Security

ALTER TABLE tastings ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for User Data

-- Tastings
CREATE POLICY "Users can view own tastings" ON tastings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tastings" ON tastings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tastings" ON tastings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tastings" ON tastings
  FOR DELETE USING (auth.uid() = user_id);

-- Photos
CREATE POLICY "Users can view own photos" ON photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- Scans
CREATE POLICY "Users can view own scans" ON scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" ON scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans" ON scans
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans" ON scans
  FOR DELETE USING (auth.uid() = user_id);

-- Restaurant Favorites
CREATE POLICY "Users can view own favorites" ON restaurant_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON restaurant_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON restaurant_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Public Read Policies for Reference Tables
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

-- Indexes

-- Geography Indexes
CREATE INDEX idx_regions_geom ON regions USING GIST (geom);
CREATE INDEX idx_producers_location ON producers USING GIST (location);
CREATE INDEX idx_vineyards_location ON vineyards USING GIST (location);
CREATE INDEX idx_vineyards_centroid ON vineyards USING GIST (centroid);

-- Search Indexes
CREATE INDEX idx_wines_name_trgm ON wines USING GIN (name gin_trgm_ops);
CREATE INDEX idx_producers_name_trgm ON producers USING GIN (name gin_trgm_ops);
CREATE INDEX idx_grape_varietals_name_trgm ON grape_varietals USING GIN (name gin_trgm_ops);
CREATE INDEX idx_regions_name_trgm ON regions USING GIN (name gin_trgm_ops);

-- Query Performance Indexes
CREATE INDEX idx_tastings_user_date ON tastings(user_id, tasted_at DESC);
CREATE INDEX idx_tastings_user_vintage ON tastings(user_id, vintage_id);
CREATE INDEX idx_tastings_verdict ON tastings(verdict) WHERE verdict IS NOT NULL;
CREATE INDEX idx_vintages_wine_year ON vintages(wine_id, year DESC);
CREATE INDEX idx_photos_tasting ON photos(tasting_id);
CREATE INDEX idx_wine_list_items_list ON wine_list_items(wine_list_id);

-- Vector Index
CREATE INDEX idx_vintages_vector ON vintages USING ivfflat (varietal_vector vector_cosine_ops)
  WITH (lists = 100);

-- Views and Functions

-- User preference vectors
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

-- RPC Functions

-- Recommend vintages
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

-- User tastings GeoJSON
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

-- Upsert scan match
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