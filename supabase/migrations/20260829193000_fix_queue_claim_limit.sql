CREATE OR REPLACE FUNCTION "public"."claim_wines_added_queue_jobs"("p_limit" integer DEFAULT 5)
RETURNS TABLE("id" "uuid", "user_id" "uuid", "image_url" "text", "ocr_text" "text", "scan_id" "uuid", "idempotency_key" "text", "retry_count" integer)
LANGUAGE "plpgsql"
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH pending_jobs AS MATERIALIZED (
    SELECT waq2.id
    FROM wines_added_queue waq2
    WHERE waq2.status = 'pending'
      AND waq2.retry_count < 3
    ORDER BY waq2.created_at ASC
    LIMIT greatest(p_limit, 0)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE wines_added_queue waq
  SET
    status = 'processing',
    processed_at = NOW()
  FROM pending_jobs
  WHERE waq.id = pending_jobs.id
  RETURNING
    waq.id,
    waq.user_id,
    waq.image_url,
    waq.ocr_text,
    waq.scan_id,
    waq.idempotency_key,
    waq.retry_count;
END;
$$;
