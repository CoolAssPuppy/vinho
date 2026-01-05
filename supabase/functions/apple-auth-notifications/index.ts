import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts"

/**
 * Sign in with Apple Server-to-Server Notifications
 *
 * Apple sends notifications when:
 * - consent-revoked: User stopped using their Apple ID with your app
 * - account-delete: User requested deletion of their Apple ID
 * - email-disabled: User stopped receiving emails via Apple's relay
 * - email-enabled: User enabled email forwarding
 *
 * Documentation: https://developer.apple.com/documentation/sign_in_with_apple/processing_changes_for_sign_in_with_apple_accounts
 */

interface AppleNotificationPayload {
  iss: string // https://appleid.apple.com
  aud: string // Your app's bundle ID
  iat: number // Issued at timestamp
  jti: string // Unique identifier for this notification
  events: string // JSON-encoded events object
}

interface AppleEvent {
  type: "email-disabled" | "email-enabled" | "consent-revoked" | "account-delete"
  sub: string // Apple's unique user identifier
  email?: string
  is_private_email?: string
  event_time: number
}

// Apple's JWKS endpoint for verifying tokens
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"

// Cache for Apple's public keys
let jwksCache: jose.JSONWebKeySet | null = null
let jwksCacheTime = 0
const JWKS_CACHE_DURATION = 3600000 // 1 hour in milliseconds

async function getApplePublicKeys(): Promise<jose.JSONWebKeySet> {
  const now = Date.now()

  if (jwksCache && (now - jwksCacheTime) < JWKS_CACHE_DURATION) {
    return jwksCache
  }

  const response = await fetch(APPLE_JWKS_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch Apple JWKS: ${response.status}`)
  }

  jwksCache = await response.json()
  jwksCacheTime = now

  return jwksCache!
}

async function verifyAppleJWT(token: string, bundleId: string): Promise<AppleNotificationPayload> {
  const jwks = await getApplePublicKeys()
  const JWKS = jose.createLocalJWKSet(jwks)

  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: "https://appleid.apple.com",
    audience: bundleId,
  })

  return payload as unknown as AppleNotificationPayload
}

serve(async (req) => {
  // Only accept POST requests from Apple
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    // Apple sends the notification as form-encoded data with a "payload" field
    const formData = await req.formData()
    const payload = formData.get("payload")

    if (!payload || typeof payload !== "string") {
      console.error("Missing or invalid payload in Apple notification")
      return new Response(
        JSON.stringify({ error: "Missing payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get the bundle ID from environment
    const bundleId = Deno.env.get("APPLE_BUNDLE_ID")
    if (!bundleId) {
      console.error("APPLE_BUNDLE_ID not configured")
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Verify the JWT from Apple
    let decodedPayload: AppleNotificationPayload
    try {
      decodedPayload = await verifyAppleJWT(payload, bundleId)
    } catch (verifyError) {
      console.error("JWT verification failed:", verifyError)
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    // Parse the events from the payload
    const events: Record<string, AppleEvent> = JSON.parse(decodedPayload.events)

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("VINHO_SERVICE_ROLE_KEY") ?? ""
    )

    // Process each event
    for (const [eventType, event] of Object.entries(events)) {
      console.log(`Processing Apple event: ${eventType}`, {
        sub: event.sub,
        event_time: event.event_time,
      })

      switch (event.type) {
        case "account-delete":
          await handleAccountDelete(supabaseAdmin, event)
          break

        case "consent-revoked":
          await handleConsentRevoked(supabaseAdmin, event)
          break

        case "email-disabled":
          await handleEmailDisabled(supabaseAdmin, event)
          break

        case "email-enabled":
          await handleEmailEnabled(supabaseAdmin, event)
          break

        default:
          console.log(`Unhandled Apple event type: ${eventType}`)
      }
    }

    // Return 200 OK to acknowledge receipt
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error processing Apple notification:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

/**
 * Handle account deletion request from Apple
 * This is triggered when a user deletes their Apple ID
 */
async function handleAccountDelete(
  supabase: ReturnType<typeof createClient>,
  event: AppleEvent
): Promise<void> {
  console.log(`Processing account deletion for Apple user: ${event.sub}`)

  // Find the user by their Apple identity
  const { data: identities, error: identityError } = await supabase
    .from("auth.identities")
    .select("user_id")
    .eq("provider", "apple")
    .eq("provider_id", event.sub)

  if (identityError) {
    // Try using auth admin API instead since identities table may not be directly accessible
    console.log("Falling back to auth admin API for user lookup")

    // Use the admin API to list users and find by Apple provider_id
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error("Error listing users:", usersError)
      throw usersError
    }

    const user = users.find(u =>
      u.identities?.some(i => i.provider === "apple" && i.provider_id === event.sub)
    )

    if (!user) {
      console.log(`No user found with Apple ID: ${event.sub}`)
      return
    }

    await deleteUserData(supabase, user.id)
    return
  }

  if (!identities || identities.length === 0) {
    console.log(`No user found with Apple ID: ${event.sub}`)
    return
  }

  const userId = identities[0].user_id
  await deleteUserData(supabase, userId)
}

/**
 * Delete all user data and the user account
 */
async function deleteUserData(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  console.log(`Deleting data for user: ${userId}`)

  // Delete user's tastings
  const { error: tastingsError } = await supabase
    .from("tastings")
    .delete()
    .eq("user_id", userId)

  if (tastingsError) {
    console.error("Error deleting tastings:", tastingsError)
  }

  // Delete user's scans
  const { error: scansError } = await supabase
    .from("scans")
    .delete()
    .eq("user_id", userId)

  if (scansError) {
    console.error("Error deleting scans:", scansError)
  }

  // Delete user's photos
  const { error: photosError } = await supabase
    .from("photos")
    .delete()
    .eq("user_id", userId)

  if (photosError) {
    console.error("Error deleting photos:", photosError)
  }

  // Delete user's sharing connections (as sharer)
  const { error: sharingSharerError } = await supabase
    .from("sharing_connections")
    .delete()
    .eq("sharer_id", userId)

  if (sharingSharerError) {
    console.error("Error deleting sharing connections (sharer):", sharingSharerError)
  }

  // Delete user's sharing connections (as viewer)
  const { error: sharingViewerError } = await supabase
    .from("sharing_connections")
    .delete()
    .eq("viewer_id", userId)

  if (sharingViewerError) {
    console.error("Error deleting sharing connections (viewer):", sharingViewerError)
  }

  // Delete user's sharing preferences
  const { error: prefsError } = await supabase
    .from("user_sharing_preferences")
    .delete()
    .eq("user_id", userId)

  if (prefsError) {
    console.error("Error deleting sharing preferences:", prefsError)
  }

  // Delete user's recommendations cache
  const { error: recsError } = await supabase
    .from("wine_recommendations_cache")
    .delete()
    .eq("user_id", userId)

  if (recsError) {
    console.error("Error deleting recommendations cache:", recsError)
  }

  // Delete user's wine queue items
  const { error: queueError } = await supabase
    .from("wines_added_queue")
    .delete()
    .eq("user_id", userId)

  if (queueError) {
    console.error("Error deleting wine queue items:", queueError)
  }

  // Delete user's enrichment queue items
  const { error: enrichmentError } = await supabase
    .from("wines_enrichment_queue")
    .delete()
    .eq("user_id", userId)

  if (enrichmentError) {
    console.error("Error deleting enrichment queue items:", enrichmentError)
  }

  // Delete user's profile
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)

  if (profileError) {
    console.error("Error deleting profile:", profileError)
  }

  // Finally, delete the user account from auth
  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)

  if (deleteUserError) {
    console.error("Error deleting user account:", deleteUserError)
    throw deleteUserError
  }

  console.log(`Successfully deleted user account and all data for: ${userId}`)
}

/**
 * Handle consent revoked event
 * User has stopped using their Apple ID with your app
 */
async function handleConsentRevoked(
  supabase: ReturnType<typeof createClient>,
  event: AppleEvent
): Promise<void> {
  console.log(`Processing consent revoked for Apple user: ${event.sub}`)

  // Find the user and unlink their Apple identity
  // The user can still use other sign-in methods if they have them
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error("Error listing users:", usersError)
    throw usersError
  }

  const user = users.find(u =>
    u.identities?.some(i => i.provider === "apple" && i.provider_id === event.sub)
  )

  if (!user) {
    console.log(`No user found with Apple ID: ${event.sub}`)
    return
  }

  // Log the consent revocation
  // In a more complex app, you might want to:
  // - Notify the user they need to re-authenticate or use another method
  // - Disable certain features until they re-authenticate
  // - Track this in an audit log
  console.log(`User ${user.id} has revoked Apple consent. They may need to re-authenticate.`)
}

/**
 * Handle email disabled event
 * User has stopped receiving emails via Apple's private relay
 */
async function handleEmailDisabled(
  supabase: ReturnType<typeof createClient>,
  event: AppleEvent
): Promise<void> {
  console.log(`Email disabled for Apple user: ${event.sub}`)

  // In most cases, you might want to:
  // - Update a flag in the user's profile
  // - Switch to push notifications for important communications
  // - Log this for analytics

  // For now, we just log it
  console.log(`User's Apple relay email is now disabled. Email: ${event.email || 'unknown'}`)
}

/**
 * Handle email enabled event
 * User has enabled email forwarding via Apple's relay
 */
async function handleEmailEnabled(
  supabase: ReturnType<typeof createClient>,
  event: AppleEvent
): Promise<void> {
  console.log(`Email enabled for Apple user: ${event.sub}`)

  // Log that email is now working for this user
  console.log(`User's Apple relay email is now enabled. Email: ${event.email || 'unknown'}`)
}
