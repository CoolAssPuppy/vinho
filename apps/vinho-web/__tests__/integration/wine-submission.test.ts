/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  TEST_USER_ID,
  cleanupTestUser,
  createAuthenticatedClient,
  createSecondTestUser,
  createServiceRoleClient,
} from './helpers/supabase-test-client'

describe('Wine submission workflow', () => {
  jest.setTimeout(30000)

  const serviceClient = createServiceRoleClient()
  let scanId: string
  let queueId: string

  afterAll(async () => {
    if (queueId) {
      await serviceClient.from('wines_added_queue').delete().eq('id', queueId)
    }
    if (scanId) {
      await serviceClient.from('scans').delete().eq('id', scanId)
    }
  })

  it('should create a scan record for the authenticated user', async () => {
    const { client } = await createAuthenticatedClient()

    const { data, error } = await client
      .from('scans')
      .insert({
        user_id: TEST_USER_ID,
        image_path: 'scans/test-wine-label.jpg',
        scan_image_url: `${SUPABASE_URL}/storage/v1/object/public/scans/test-wine-label.jpg`,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.user_id).toBe(TEST_USER_ID)
    expect(data!.image_path).toBe('scans/test-wine-label.jpg')
    scanId = data!.id
  })

  it('should create a queue item linked to the scan', async () => {
    const { client } = await createAuthenticatedClient()

    const { data, error } = await client
      .from('wines_added_queue')
      .insert({
        user_id: TEST_USER_ID,
        image_url: `${SUPABASE_URL}/storage/v1/object/public/scans/test-wine-label.jpg`,
        scan_id: scanId,
        status: 'pending',
        idempotency_key: `test-${Date.now()}`,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.status).toBe('pending')
    expect(data!.user_id).toBe(TEST_USER_ID)
    expect(data!.scan_id).toBe(scanId)
    queueId = data!.id
  })

  it('should not allow another user to see the scan', async () => {
    let secondUserId: string | undefined
    try {
      const secondUser = await createSecondTestUser(serviceClient)
      secondUserId = secondUser.id

      const secondClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      await secondClient.auth.signInWithPassword({
        email: secondUser.email,
        password: 'testpassword123',
      })

      const { data } = await secondClient.from('scans').select('id').eq('id', scanId)
      expect(data).toEqual([])
    } finally {
      if (secondUserId) await cleanupTestUser(serviceClient, secondUserId)
    }
  })

  it('should not allow another user to see the queue item', async () => {
    let secondUserId: string | undefined
    try {
      const secondUser = await createSecondTestUser(serviceClient)
      secondUserId = secondUser.id

      const secondClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      await secondClient.auth.signInWithPassword({
        email: secondUser.email,
        password: 'testpassword123',
      })

      const { data } = await secondClient
        .from('wines_added_queue')
        .select('id')
        .eq('id', queueId)
      expect(data).toEqual([])
    } finally {
      if (secondUserId) await cleanupTestUser(serviceClient, secondUserId)
    }
  })
})
