import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@emails.vinho.dev'

interface InvitationRequest {
  viewer_email: string
}

interface InvitationResponse {
  success: boolean
  connection_id?: string
  invite_code?: string
  action?: 'sent' | 'resent' | 'reshared'
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

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
      throw new Error('Not authenticated')
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { viewer_email }: InvitationRequest = await req.json()

    // Validate email
    if (!viewer_email || !viewer_email.includes('@')) {
      return Response.json(
        { success: false, error: 'Valid email address is required' } as InvitationResponse,
        { status: 400 }
      )
    }

    // Check if invitation already exists for this email
    const { data: existingConnections, error: fetchError } = await supabaseAdmin
      .from('sharing_connections')
      .select('*')
      .eq('sharer_id', user.id)
      .eq('viewer_email', viewer_email)

    if (fetchError) throw fetchError

    const existingConnection = existingConnections?.[0]

    let connectionId: string
    let inviteCode: string
    let action: 'sent' | 'resent' | 'reshared' = 'sent'

    if (existingConnection) {
      // Handle existing connection based on status
      if (existingConnection.status === 'accepted') {
        return Response.json({
          success: false,
          error: 'Already sharing with this person'
        } as InvitationResponse)
      }

      // Generate new invite code
      const { data: codeData, error: codeError } = await supabaseAdmin.rpc('generate_invite_code')
      if (codeError) throw codeError
      inviteCode = codeData

      if (existingConnection.status === 'pending') {
        // Resend the invitation
        action = 'resent'
      } else if (existingConnection.status === 'rejected' || existingConnection.status === 'revoked') {
        // Allow re-inviting after rejection/revocation
        action = 'reshared'
      }

      // Update existing connection
      const { error: updateError } = await supabaseAdmin
        .from('sharing_connections')
        .update({
          status: 'pending',
          invite_code: inviteCode,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          used_at: null,
          accepted_at: null
        })
        .eq('id', existingConnection.id)

      if (updateError) throw updateError

      connectionId = existingConnection.id
    } else {
      // Generate new invite code
      const { data: codeData, error: codeError } = await supabaseAdmin.rpc('generate_invite_code')
      if (codeError) throw codeError
      inviteCode = codeData

      // Create new invitation
      const { data: newConnection, error: insertError } = await supabaseAdmin
        .from('sharing_connections')
        .insert({
          sharer_id: user.id,
          viewer_id: null, // Will be filled when they sign up/login
          viewer_email: viewer_email,
          viewer_phone: null,
          invite_code: inviteCode,
          status: 'pending',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      connectionId = newConnection.id
    }

    // Get sharer's profile for email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    const sharerName = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'A Vinho user'
      : 'A Vinho user'

    // Send invitation email
    const deepLink = `vinho://invite/${inviteCode}`
    const webLink = `https://app.vinho.dev/invite/${inviteCode}`

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wine Sharing Invitation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #fafafa;
      color: #1a1a1a;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      font-size: 36px;
      font-weight: 700;
      background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }
    .tagline {
      color: #6b7280;
      font-size: 15px;
      font-weight: 500;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .wine-icon {
      font-size: 56px;
      text-align: center;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      margin: 0 0 16px 0;
      color: #111827;
    }
    .message {
      font-size: 17px;
      line-height: 1.6;
      color: #374151;
      text-align: center;
      margin-bottom: 32px;
    }
    .highlight {
      color: #7c3aed;
      font-weight: 600;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 17px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
    }
    .alternative-link {
      text-align: center;
      margin-top: 20px;
      font-size: 15px;
      color: #6b7280;
    }
    .alternative-link a {
      color: #7c3aed;
      text-decoration: none;
      font-weight: 500;
    }
    .features {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 32px;
      margin: 24px 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .feature-item {
      display: flex;
      align-items: start;
      margin-bottom: 20px;
    }
    .feature-item:last-child {
      margin-bottom: 0;
    }
    .feature-icon {
      margin-right: 16px;
      font-size: 24px;
      flex-shrink: 0;
    }
    .feature-text {
      color: #374151;
      font-size: 15px;
      line-height: 1.6;
    }
    .feature-text strong {
      color: #111827;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #7c3aed;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Vinho</div>
      <div class="tagline">Your Personal Wine Journey</div>
    </div>

    <div class="card">
      <div class="wine-icon">🍷</div>
      <h1>You're Invited!</h1>
      <p class="message">
        <span class="highlight">${sharerName}</span> wants to share their wine journey with you on Vinho.
        <br><br>
        Sign up or log in to view their tasting notes, ratings, and discover new wines together.
      </p>

      <div class="button-container">
        <a href="${webLink}" class="button">
          Accept Invitation
        </a>
      </div>

      <div class="alternative-link">
        Or <a href="${deepLink}">open in the Vinho app</a>
      </div>
    </div>

    <div class="features">
      <div class="feature-item">
        <span class="feature-icon">📝</span>
        <span class="feature-text">
          <strong>View Tastings</strong><br>
          See detailed tasting notes and ratings from ${sharerName}'s wine collection
        </span>
      </div>
      <div class="feature-item">
        <span class="feature-icon">🗺️</span>
        <span class="feature-text">
          <strong>Explore Together</strong><br>
          Discover wine regions and producers they've experienced
        </span>
      </div>
      <div class="feature-item">
        <span class="feature-icon">⭐</span>
        <span class="feature-text">
          <strong>Get Inspired</strong><br>
          Find new wines to try based on their recommendations
        </span>
      </div>
    </div>

    <div class="footer">
      <p>
        This invitation was sent to ${viewer_email} by ${user.email}
        <br>
        <a href="https://vinho.dev">Learn more about Vinho</a> ·
        <a href="https://vinho.dev/privacy">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
    `

    const textContent = `
${sharerName} has invited you to join Vinho and view their wine tastings!

Sign up or log in to:
• View their detailed tasting notes and ratings
• Explore wine regions and producers together
• Get inspired by their wine recommendations

Get Started: ${webLink}

Or open in the Vinho app: ${deepLink}

This invitation was sent to ${viewer_email} by ${user.email}
Learn more: https://vinho.dev
    `

    // Send email using Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `Vinho <${RESEND_FROM_EMAIL}>`,
        to: [viewer_email],
        subject: `${sharerName} invited you to share wine tastings on Vinho`,
        html: htmlContent,
        text: textContent,
      }),
    })

    if (!emailRes.ok) {
      const errorData = await emailRes.json()
      console.error('Resend API error:', errorData)
      // Don't fail the invitation if email fails
    }

    return Response.json({
      success: true,
      connection_id: connectionId,
      invite_code: inviteCode,
      action: action
    } as InvitationResponse)

  } catch (error) {
    console.error('Error sending invitation:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as InvitationResponse,
      { status: 500 }
    )
  }
})
