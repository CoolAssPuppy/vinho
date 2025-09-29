-- Create enrichment queue table for processing wine enrichments
CREATE TABLE IF NOT EXISTS wines_enrichment_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vintage_id UUID REFERENCES vintages(id) ON DELETE CASCADE,
    wine_id UUID REFERENCES wines(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Wine data for enrichment
    producer_name TEXT NOT NULL,
    wine_name TEXT NOT NULL,
    year INTEGER,
    region TEXT,
    country TEXT,
    existing_varietals TEXT[], -- Varietals already known

    -- Queue management
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0, -- Higher priority processed first

    -- Results
    enrichment_data JSONB,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Prevent duplicate enrichments for same vintage
    CONSTRAINT unique_vintage_enrichment UNIQUE (vintage_id)
);

-- Create indexes for efficient queue processing
CREATE INDEX idx_enrichment_queue_status ON wines_enrichment_queue(status, priority DESC, created_at);
CREATE INDEX idx_enrichment_queue_user ON wines_enrichment_queue(user_id);
CREATE INDEX idx_enrichment_queue_vintage ON wines_enrichment_queue(vintage_id);

-- Function to claim enrichment jobs atomically
CREATE OR REPLACE FUNCTION claim_enrichment_jobs(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    vintage_id UUID,
    wine_id UUID,
    user_id UUID,
    producer_name TEXT,
    wine_name TEXT,
    year INTEGER,
    region TEXT,
    country TEXT,
    existing_varietals TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE wines_enrichment_queue
    SET
        status = 'processing',
        updated_at = NOW()
    WHERE wines_enrichment_queue.id IN (
        SELECT wines_enrichment_queue.id
        FROM wines_enrichment_queue
        WHERE wines_enrichment_queue.status = 'pending'
          AND wines_enrichment_queue.retry_count < 3
        ORDER BY priority DESC, created_at
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    RETURNING
        wines_enrichment_queue.id,
        wines_enrichment_queue.vintage_id,
        wines_enrichment_queue.wine_id,
        wines_enrichment_queue.user_id,
        wines_enrichment_queue.producer_name,
        wines_enrichment_queue.wine_name,
        wines_enrichment_queue.year,
        wines_enrichment_queue.region,
        wines_enrichment_queue.country,
        wines_enrichment_queue.existing_varietals;
END;
$$;

-- RLS policies
ALTER TABLE wines_enrichment_queue ENABLE ROW LEVEL SECURITY;

-- Users can see their own enrichment queue items
CREATE POLICY "Users can view own enrichment queue items"
    ON wines_enrichment_queue FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert enrichment requests for their wines
CREATE POLICY "Users can queue enrichments for own wines"
    ON wines_enrichment_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own queue items (e.g., cancel)
CREATE POLICY "Users can update own enrichment queue items"
    ON wines_enrichment_queue FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON wines_enrichment_queue TO authenticated;
GRANT EXECUTE ON FUNCTION claim_enrichment_jobs TO service_role;