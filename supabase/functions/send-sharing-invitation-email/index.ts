import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@emails.vinho.dev'

interface EmailRequest {
  viewer_email: string
  sharer_name: string
  sharer_email: string
  connection_id: string
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
    const { viewer_email, sharer_name, sharer_email, connection_id }: EmailRequest = await req.json()

    // Generate deep link for iOS app (will open in app if installed, otherwise fallback to web)
    const deepLink = `vinho://sharing/accept/${connection_id}`
    const webLink = `https://app.vinho.dev/sharing?connection=${connection_id}`

    // Beautiful HTML email template
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
      background-color: #0a0a0a;
      color: #ffffff;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    .tagline {
      color: #9ca3af;
      font-size: 14px;
    }
    .card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 30px;
    }
    .wine-icon {
      font-size: 48px;
      text-align: center;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin: 0 0 16px 0;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #d1d5db;
      text-align: center;
      margin-bottom: 32px;
    }
    .highlight {
      color: #8b5cf6;
      font-weight: 600;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.3);
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .alternative-link {
      text-align: center;
      margin-top: 24px;
      font-size: 14px;
      color: #9ca3af;
    }
    .alternative-link a {
      color: #8b5cf6;
      text-decoration: none;
    }
    .features {
      margin: 40px 0;
      padding: 0;
      list-style: none;
    }
    .feature-item {
      display: flex;
      align-items: start;
      margin-bottom: 20px;
    }
    .feature-icon {
      margin-right: 12px;
      font-size: 20px;
    }
    .feature-text {
      color: #d1d5db;
      font-size: 14px;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #374151;
    }
    .footer a {
      color: #8b5cf6;
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
      <h1>You've Been Invited!</h1>
      <p class="message">
        <span class="highlight">${sharer_name}</span> wants to share their wine journey with you on Vinho.
        <br><br>
        Accept this invitation to view their tasting notes, ratings, and discover new wines together.
      </p>

      <div class="button-container">
        <a href="${webLink}" class="button">
          Accept Invitation
        </a>
      </div>

      <div class="alternative-link">
        Or open in the Vinho app: <a href="${deepLink}">Open App</a>
      </div>
    </div>

    <ul class="features">
      <li class="feature-item">
        <span class="feature-icon">📝</span>
        <span class="feature-text">
          <strong>View Tastings:</strong> See detailed tasting notes and ratings from ${sharer_name}'s wine collection
        </span>
      </li>
      <li class="feature-item">
        <span class="feature-icon">🗺️</span>
        <span class="feature-text">
          <strong>Explore Together:</strong> Discover wine regions and producers they've experienced
        </span>
      </li>
      <li class="feature-item">
        <span class="feature-icon">⭐</span>
        <span class="feature-text">
          <strong>Get Inspired:</strong> Find new wines to try based on their recommendations
        </span>
      </li>
    </ul>

    <div class="footer">
      <p>
        This invitation was sent to ${viewer_email} by ${sharer_email}
        <br>
        <a href="https://vinho.dev">Learn more about Vinho</a> |
        <a href="https://vinho.dev/privacy">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
    `

    const textContent = `
${sharer_name} has invited you to view their wine tastings on Vinho!

Accept this invitation to:
• View their detailed tasting notes and ratings
• Explore wine regions and producers together
• Get inspired by their wine recommendations

Accept Invitation: ${webLink}

Or open in the Vinho app: ${deepLink}

This invitation was sent to ${viewer_email} by ${sharer_email}
Learn more: https://vinho.dev
    `

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `Vinho <${RESEND_FROM_EMAIL}>`,
        to: [viewer_email],
        subject: `${sharer_name} invited you to share wine tastings on Vinho`,
        html: htmlContent,
        text: textContent,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, email_id: data.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200
      },
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500
      },
    )
  }
})
