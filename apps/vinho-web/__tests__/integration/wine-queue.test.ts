/**
 * @jest-environment node
 */
import { TEST_USER_ID, createServiceRoleClient } from './helpers/supabase-test-client'

describe('Wine queue processing', () => {
  jest.setTimeout(30000)

  const serviceClient = createServiceRoleClient()
  const createdIds: string[] = []

  afterAll(async () => {
    for (const id of createdIds) {
      await serviceClient.from('wines_added_queue').delete().eq('id', id)
    }
  })

  it('should insert a queue item via service role', async () => {
    const { data, error } = await serviceClient
      .from('wines_added_queue')
      .insert({
        user_id: TEST_USER_ID,
        image_url: 'https://example.com/test.jpg',
        status: 'pending',
        idempotency_key: `queue-test-${Date.now()}`,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.status).toBe('pending')
    expect(data!.retry_count).toBe(0)
    createdIds.push(data!.id)
  })

  it('should claim queue jobs atomically', async () => {
    const items = await Promise.all(
      [1, 2, 3].map(async (i) => {
        const { data } = await serviceClient
          .from('wines_added_queue')
          .insert({
            user_id: TEST_USER_ID,
            image_url: `https://example.com/test-${i}.jpg`,
            status: 'pending',
            idempotency_key: `claim-test-${Date.now()}-${i}`,
          })
          .select()
          .single()
        createdIds.push(data!.id)
        return data!
      }),
    )

    const { data: claimed, error } = await serviceClient.rpc('claim_wines_added_queue_jobs', {
      p_limit: 2,
    })

    expect(error).toBeNull()
    expect(claimed!.length).toBeLessThanOrEqual(2)

    for (const job of claimed!) {
      const { data } = await serviceClient
        .from('wines_added_queue')
        .select('status')
        .eq('id', (job as { id: string }).id)
        .single()
      expect(data!.status).toBe('processing')
    }

    // Mark claimed items so they get cleaned up
    for (const job of claimed!) {
      const jobId = (job as { id: string }).id
      if (!createdIds.includes(jobId)) {
        createdIds.push(jobId)
      }
    }

    void items
  })

  it('should transition status from working to completed', async () => {
    const { data: item } = await serviceClient
      .from('wines_added_queue')
      .insert({
        user_id: TEST_USER_ID,
        image_url: 'https://example.com/transition-test.jpg',
        status: 'working',
        idempotency_key: `transition-test-${Date.now()}`,
      })
      .select()
      .single()
    createdIds.push(item!.id)

    const { error } = await serviceClient
      .from('wines_added_queue')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', item!.id)

    expect(error).toBeNull()

    const { data: updated } = await serviceClient
      .from('wines_added_queue')
      .select('status, processed_at')
      .eq('id', item!.id)
      .single()
    expect(updated!.status).toBe('completed')
    expect(updated!.processed_at).not.toBeNull()
  })

  it('should transition status from working to failed', async () => {
    const { data: item } = await serviceClient
      .from('wines_added_queue')
      .insert({
        user_id: TEST_USER_ID,
        image_url: 'https://example.com/fail-test.jpg',
        status: 'working',
        idempotency_key: `fail-test-${Date.now()}`,
      })
      .select()
      .single()
    createdIds.push(item!.id)

    const { error } = await serviceClient
      .from('wines_added_queue')
      .update({ status: 'failed', error_message: 'OCR processing failed' })
      .eq('id', item!.id)

    expect(error).toBeNull()

    const { data: updated } = await serviceClient
      .from('wines_added_queue')
      .select('status, error_message')
      .eq('id', item!.id)
      .single()
    expect(updated!.status).toBe('failed')
    expect(updated!.error_message).toBe('OCR processing failed')
  })

  it('should enforce max retry count', async () => {
    const { data: item } = await serviceClient
      .from('wines_added_queue')
      .insert({
        user_id: TEST_USER_ID,
        image_url: 'https://example.com/retry-test.jpg',
        status: 'pending',
        retry_count: 3,
        idempotency_key: `retry-test-${Date.now()}`,
      })
      .select()
      .single()
    createdIds.push(item!.id)

    const { error } = await serviceClient
      .from('wines_added_queue')
      .update({ retry_count: 4 })
      .eq('id', item!.id)

    expect(error).not.toBeNull()
  })
})
