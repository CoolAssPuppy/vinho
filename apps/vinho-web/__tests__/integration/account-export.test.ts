import { createAuthenticatedClient, TEST_USER_ID } from './helpers/supabase-test-client'

describe('Account data export', () => {
  it('returns the signed-in user data without another user records', async () => {
    const { client } = await createAuthenticatedClient()

    const { data, error } = await client.functions.invoke('export-user-data')

    expect(error).toBeNull()
    expect(data.user.id).toBe(TEST_USER_ID)
    expect(data.profile.id).toBe(TEST_USER_ID)
    expect(data.tastings.every((row: { user_id: string }) => row.user_id === TEST_USER_ID)).toBe(true)
    expect(data.scans.every((row: { user_id: string }) => row.user_id === TEST_USER_ID)).toBe(true)
    expect(data.generated_at).toBeDefined()
  })
})
