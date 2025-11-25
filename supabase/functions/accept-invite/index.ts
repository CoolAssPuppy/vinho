import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  handleCorsPreFlight,
  getCorsHeaders,
} from "../../shared/security.ts";

interface AcceptInviteRequest {
  code: string
}

interface AcceptInviteResponse {
  success: boolean
  connection_id?: string
  sharer_id?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("Origin");

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Not authenticated')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated' } as AcceptInviteResponse),
        { status: 401, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      )
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { code }: AcceptInviteRequest = await req.json()

    // Validate code
    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invite code is required' } as AcceptInviteResponse),
        { status: 400, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      )
    }

    // Find the invite
    const { data: invites, error: fetchError } = await supabaseAdmin
      .from('sharing_connections')
      .select('*')
      .eq('invite_code', code)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (fetchError) throw fetchError

    const invite = invites?.[0]

    if (!invite) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired invite code' } as AcceptInviteResponse),
        { status: 404, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      )
    }

    // Prevent self-invitation
    if (invite.sharer_id === user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot accept your own invitation' } as AcceptInviteResponse),
        { status: 400, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      )
    }

    // Accept the invitation
    const { error: updateError } = await supabaseAdmin
      .from('sharing_connections')
      .update({
        viewer_id: user.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invite.id)

    if (updateError) throw updateError

    // Add sharer to visible sharers by default
    const { data: existingPrefs, error: prefsError } = await supabaseAdmin
      .from('user_sharing_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', prefsError)
    }

    if (existingPrefs) {
      // Update existing preferences
      const visibleSharers = existingPrefs.visible_sharers || []

      // Add sharer if not already in list
      if (!visibleSharers.includes(invite.sharer_id)) {
        const { error: updatePrefsError } = await supabaseAdmin
          .from('user_sharing_preferences')
          .update({
            visible_sharers: [...visibleSharers, invite.sharer_id],
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (updatePrefsError) {
          console.error('Error updating preferences:', updatePrefsError)
        }
      }
    } else {
      // Create new preferences with sharer visible by default
      const { error: insertPrefsError } = await supabaseAdmin
        .from('user_sharing_preferences')
        .insert({
          user_id: user.id,
          visible_sharers: [invite.sharer_id],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertPrefsError) {
        console.error('Error creating preferences:', insertPrefsError)
      }
    }

    // TODO: Send welcome/connection notification email here
    // This is a great place to add notifications in the future

    return new Response(
      JSON.stringify({
        success: true,
        connection_id: invite.id,
        sharer_id: invite.sharer_id
      } as AcceptInviteResponse),
      { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Error accepting invite:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as AcceptInviteResponse),
      { status: 500, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
    )
  }
})
