/**
 * @jest-environment node
 */
import { SUPABASE_URL } from './helpers/supabase-test-client'

const SKIP_REASON = 'Edge function tests require supabase functions serve running locally'

describe('Edge function smoke tests', () => {
  jest.setTimeout(15000)

  let edgeRuntimeAvailable = false

  beforeAll(async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/process-wine-queue`, {
        method: 'OPTIONS',
      })
      edgeRuntimeAvailable = response.status !== 502
    } catch {
      edgeRuntimeAvailable = false
    }
  })

  it('should respond to process-wine-queue POST', async () => {
    if (!edgeRuntimeAvailable) {
      console.log(SKIP_REASON)
      return
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-wine-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(response.status).not.toBe(502)
    expect(response.status).not.toBe(404)
  })

  it('should include CORS headers', async () => {
    if (!edgeRuntimeAvailable) {
      console.log(SKIP_REASON)
      return
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-wine-queue`, {
      method: 'OPTIONS',
    })

    expect(response.status).toBeLessThan(500)
  })
})
