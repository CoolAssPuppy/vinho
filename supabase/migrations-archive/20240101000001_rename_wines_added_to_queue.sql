-- Rename wines_added table to wines_added_queue for clarity
ALTER TABLE wines_added RENAME TO wines_added_queue;

-- Update the RPC function to use new table name
CREATE OR REPLACE FUNCTION claim_wines_added_jobs(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    image_url TEXT,
    ocr_text TEXT,
    scan_id UUID,
    retry_count INTEGER,
    idempotency_key TEXT,
    processed_data JSONB,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE wines_added_queue
    SET
        status = 'processing',
        updated_at = NOW()
    WHERE wines_added_queue.id IN (
        SELECT wines_added_queue.id
        FROM wines_added_queue
        WHERE wines_added_queue.status = 'pending'
          AND wines_added_queue.retry_count < 3
        ORDER BY wines_added_queue.created_at
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    RETURNING
        wines_added_queue.id,
        wines_added_queue.user_id,
        wines_added_queue.image_url,
        wines_added_queue.ocr_text,
        wines_added_queue.scan_id,
        wines_added_queue.retry_count,
        wines_added_queue.idempotency_key,
        wines_added_queue.processed_data,
        wines_added_queue.status;
END;
$$;

-- Update any views or functions that reference the old table name
-- Note: The indexes, constraints, and policies will automatically follow the renamed table