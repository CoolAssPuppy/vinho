import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')!

interface SMSRequest {
  viewer_phone: string
  sharer_name: string
  invite_code: string
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
    const { viewer_phone, sharer_name, invite_code }: SMSRequest = await req.json()

    // Validate phone number (basic check)
    if (!viewer_phone || viewer_phone.length < 10) {
      throw new Error('Invalid phone number')
    }

    // Format phone number (ensure it has + prefix for international format)
    const formattedPhone = viewer_phone.startsWith('+') ? viewer_phone : `+1${viewer_phone.replace(/\D/g, '')}`

    // Generate invite links
    const deepLink = `vinho://invite/${invite_code}`
    const webLink = `https://app.vinho.dev/invite/${invite_code}`

    // SMS message (keep it short and actionable for young users)
    const message = `${sharer_name} invited you to share wine tastings on Vinho! 🍷

Join now: ${webLink}

Your code: ${invite_code}`

    // Send SMS using Twilio
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    const formData = new URLSearchParams({
      To: formattedPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    })

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(`Twilio API error: ${JSON.stringify(errorData)}`)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, message_sid: data.sid }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200
      },
    )

  } catch (error) {
    console.error('Error sending SMS:', error)
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
