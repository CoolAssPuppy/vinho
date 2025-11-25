import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  verifyInternalRequest,
  handleCorsPreFlight,
  getCorsHeaders,
  escapeHtml,
} from "../../shared/security.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@emails.vinho.dev'

interface WelcomeEmailRequest {
  email: string
  name?: string
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("Origin");

  try {
    // This endpoint is internal-only - must be called with service role key
    const authError = verifyInternalRequest(req);
    if (authError) return authError;

    const { email, name }: WelcomeEmailRequest = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      )
    }

    // Escape user-provided content to prevent XSS in emails
    const displayName = escapeHtml(name) || 'Wine Lover'

    const htmlContent = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafafa">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <div style="font-size:36px;font-weight:700;color:#C4161C">Vinho</div>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="font-size:56px;text-align:center;margin-bottom:24px">🍷</div>
    <h1 style="font-size:28px;font-weight:700;text-align:center;margin:0 0 16px 0;color:#111827">Welcome to Vinho, ${displayName}!</h1>
    <p style="font-size:17px;line-height:1.6;color:#374151;text-align:center;margin-bottom:32px">Your personal wine journey starts here. We're excited to help you discover, track, and share your wine experiences.</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;margin:24px 0;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="display:flex;align-items:start;margin-bottom:20px"><span style="margin-right:16px;font-size:24px">📸</span><span style="color:#374151;font-size:15px;line-height:1.6"><strong style="color:#111827;font-weight:600">Scan Wine Labels</strong><br>Instantly capture wine details with your phone camera</span></div>
    <div style="display:flex;align-items:start;margin-bottom:20px"><span style="margin-right:16px;font-size:24px">📝</span><span style="color:#374151;font-size:15px;line-height:1.6"><strong style="color:#111827;font-weight:600">Track Tastings</strong><br>Record your notes, ratings, and memories for every wine</span></div>
    <div style="display:flex;align-items:start;margin-bottom:20px"><span style="margin-right:16px;font-size:24px">🗺️</span><span style="color:#374151;font-size:15px;line-height:1.6"><strong style="color:#111827;font-weight:600">Explore on the Map</strong><br>Visualize your wine journey across regions and countries</span></div>
    <div style="display:flex;align-items:start"><span style="margin-right:16px;font-size:24px">🤝</span><span style="color:#374151;font-size:15px;line-height:1.6"><strong style="color:#111827;font-weight:600">Share with Friends</strong><br>Connect with fellow wine enthusiasts and share your discoveries</span></div>
  </div>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:24px 0;text-align:center">
    <h3 style="color:#111827;font-size:18px;font-weight:600;margin:0 0 12px 0">🎯 Use Vinho Anywhere</h3>
    <p style="color:#6b7280;font-size:14px;margin:0 0 16px 0">Vinho is available on both iOS and web, so you can access your wine collection from anywhere.</p>
  </div>
  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:24px;margin:24px 0">
    <h3 style="color:#92400e;font-size:18px;font-weight:600;margin:0 0 12px 0">🔄 Coming from Vivino?</h3>
    <p style="color:#78350f;font-size:14px;margin:0 0 16px 0;line-height:1.5">If you already have a Vivino account, it's easy to migrate your entire wine collection to Vinho! Simply log in to the web app and use the import feature to bring over all your tastings and notes.</p>
    <div style="text-align:center;margin:16px 0">
      <a href="https://www.vinho.dev/profile" style="display:inline-block;background:#C4161C;color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:600;font-size:17px;box-shadow:0 4px 12px rgba(196,22,28,0.3)">Import from Vivino</a>
    </div>
  </div>
  <div style="text-align:center;margin:32px 0">
    <a href="https://www.vinho.dev/scan" style="display:inline-block;background:#C4161C;color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:600;font-size:17px;box-shadow:0 4px 12px rgba(196,22,28,0.3)">Scan Your First Wine</a>
  </div>
  <div style="text-align:center;color:#9ca3af;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb">
    <p>Questions? We're here to help!<br><a href="https://vinho.dev" style="color:#C4161C;text-decoration:none">Learn more</a> · <a href="https://vinho.dev/privacy" style="color:#C4161C;text-decoration:none">Privacy</a></p>
  </div>
</div>
</body></html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `Vinho <${RESEND_FROM_EMAIL}>`,
        to: [email],
        subject: '🍷 Welcome to Vinho - Your Wine Journey Begins!',
        html: htmlContent,
      }),
    })

    if (!emailRes.ok) {
      const errorData = await emailRes.json()
      console.error('Resend API error:', errorData)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
    )
  }
})
