/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  TEST_USER_ID,
  cleanupTestUser,
  createAnonClient,
  createAuthenticatedClient,
  createSecondTestUser,
  createServiceRoleClient,
} from './helpers/supabase-test-client'

describe('RLS policies', () => {
  jest.setTimeout(30000)

  describe('reference table access', () => {
    it('should allow authenticated users to read wines', async () => {
      const { client } = await createAuthenticatedClient()
      const { data, error } = await client.from('wines').select('id, name').limit(5)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
    })

    it('should allow authenticated users to read producers', async () => {
      const { client } = await createAuthenticatedClient()
      const { data, error } = await client.from('producers').select('id, name').limit(5)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
    })

    it('should allow authenticated users to read regions', async () => {
      const { client } = await createAuthenticatedClient()
      const { data, error } = await client.from('regions').select('id, name').limit(5)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
    })

    it('should block authenticated users from inserting wines', async () => {
      const { client } = await createAuthenticatedClient()
      const { error } = await client.from('wines').insert({ name: 'Test Wine' })

      expect(error).not.toBeNull()
    })

    it('should block authenticated users from inserting producers', async () => {
      const { client } = await createAuthenticatedClient()
      const { error } = await client.from('producers').insert({ name: 'Test Producer' })

      expect(error).not.toBeNull()
    })

    it('should block authenticated users from inserting regions', async () => {
      const { client } = await createAuthenticatedClient()
      const { error } = await client.from('regions').insert({ name: 'Test Region' })

      expect(error).not.toBeNull()
    })
  })

  describe('user data isolation', () => {
    let secondUserId: string
    let secondUserEmail: string

    beforeAll(async () => {
      const serviceClient = createServiceRoleClient()
      const user = await createSecondTestUser(serviceClient)
      secondUserId = user.id
      secondUserEmail = user.email
    })

    afterAll(async () => {
      const serviceClient = createServiceRoleClient()
      await cleanupTestUser(serviceClient, secondUserId)
    })

    it('should not allow user B to see user A tastings', async () => {
      const secondClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      await secondClient.auth.signInWithPassword({
        email: secondUserEmail,
        password: 'testpassword123',
      })

      const { data } = await secondClient
        .from('tastings')
        .select('id')
        .eq('user_id', TEST_USER_ID)

      expect(data).toEqual([])
    })

    it('should not allow user B to see user A scans', async () => {
      const secondClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      await secondClient.auth.signInWithPassword({
        email: secondUserEmail,
        password: 'testpassword123',
      })

      const { data } = await secondClient
        .from('scans')
        .select('id')
        .eq('user_id', TEST_USER_ID)

      expect(data).toEqual([])
    })

    it('should not allow user B to see user A queue items', async () => {
      const secondClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      await secondClient.auth.signInWithPassword({
        email: secondUserEmail,
        password: 'testpassword123',
      })

      const { data } = await secondClient
        .from('wines_added_queue')
        .select('id')
        .eq('user_id', TEST_USER_ID)

      expect(data).toEqual([])
    })
  })

  describe('anonymous access', () => {
    it('should block anon from reading tastings', async () => {
      const { client } = createAnonClient()
      const { data } = await client.from('tastings').select('id').limit(1)

      const isBlocked = data === null || (Array.isArray(data) && data.length === 0)
      expect(isBlocked).toBe(true)
    })

    it('should block anon from reading scans', async () => {
      const { client } = createAnonClient()
      const { data } = await client.from('scans').select('id').limit(1)

      const isBlocked = data === null || (Array.isArray(data) && data.length === 0)
      expect(isBlocked).toBe(true)
    })

    it('should block anon from reading profiles', async () => {
      const { client } = createAnonClient()
      const { data } = await client.from('profiles').select('id').limit(1)

      const isBlocked = data === null || (Array.isArray(data) && data.length === 0)
      expect(isBlocked).toBe(true)
    })

    it('should block anon from reading queue items', async () => {
      const { client } = createAnonClient()
      const { data } = await client.from('wines_added_queue').select('id').limit(1)

      const isBlocked = data === null || (Array.isArray(data) && data.length === 0)
      expect(isBlocked).toBe(true)
    })
  })
})
