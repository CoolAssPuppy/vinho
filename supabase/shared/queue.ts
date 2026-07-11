/**
 * Shared constants for the wine/enrichment processing queues.
 */

/**
 * Maximum number of processing attempts before a queue job is marked "failed".
 *
 * A job's retry_count starts at 0 and is incremented on each failure. Once the
 * incremented count reaches MAX_QUEUE_RETRIES the job transitions to "failed"
 * instead of "pending". This matches the claim RPCs, which only pick up jobs
 * with retry_count < MAX_QUEUE_RETRIES, and the wines_added_queue
 * `retry_count <= 3` check constraint.
 */
export const MAX_QUEUE_RETRIES = 3;
