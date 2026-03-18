import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Integration tests always run against local Supabase.
// INTEGRATION_SUPABASE_URL lets CI override the host if needed.
const SUPABASE_URL = process.env.INTEGRATION_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.INTEGRATION_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.INTEGRATION_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const TEST_USER_EMAIL = 'test@vinho.app'
const TEST_USER_PASSWORD = 'testpassword123'
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'

type CreateAnonClientResult = {
  client: SupabaseClient
}

type CreateAuthenticatedClientResult = {
  client: SupabaseClient
  userId: string
}

const createAnonClient = (): CreateAnonClientResult => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return { client }
}

const createServiceRoleClient = (): SupabaseClient => {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const createAuthenticatedClient = async (): Promise<CreateAuthenticatedClientResult> => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { error } = await client.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  })
  if (error) throw new Error(`Failed to sign in test user: ${error.message}`)
  return { client, userId: TEST_USER_ID }
}

const createSecondTestUser = async (
  serviceClient: SupabaseClient,
): Promise<{ id: string; email: string }> => {
  const email = `test-other-${Date.now()}@vinho.app`
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password: 'testpassword123',
    email_confirm: true,
  })
  if (error) throw new Error(`Failed to create second test user: ${error.message}`)
  return { id: data.user.id, email }
}

const cleanupTestUser = async (serviceClient: SupabaseClient, userId: string): Promise<void> => {
  await serviceClient.from('wines_added_queue').delete().eq('user_id', userId)
  await serviceClient.from('scans').delete().eq('user_id', userId)
  await serviceClient.from('tastings').delete().eq('user_id', userId)
  await serviceClient.from('profiles').delete().eq('id', userId)
  await serviceClient.auth.admin.deleteUser(userId)
}

const waitForQueueCompletion = async (
  serviceClient: SupabaseClient,
  queueId: string,
  timeoutMs: number = 30000,
): Promise<{ status: string; processedData: unknown }> => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await serviceClient
      .from('wines_added_queue')
      .select('status, processed_data')
      .eq('id', queueId)
      .single()

    if (error) throw new Error(`Failed to check queue status: ${error.message}`)
    if (data.status === 'completed' || data.status === 'failed') {
      return { status: data.status, processedData: data.processed_data }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Queue item ${queueId} did not complete within ${timeoutMs}ms`)
}

export {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  TEST_USER_EMAIL,
  TEST_USER_ID,
  TEST_USER_PASSWORD,
  cleanupTestUser,
  createAnonClient,
  createAuthenticatedClient,
  createSecondTestUser,
  createServiceRoleClient,
  waitForQueueCompletion,
}
