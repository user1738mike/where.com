import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const METERED_SECRET_KEY = Deno.env.get('METERED_SECRET_KEY')
    const METERED_DOMAIN = Deno.env.get('METERED_DOMAIN')

    if (!METERED_SECRET_KEY || !METERED_DOMAIN) {
      return new Response(
        JSON.stringify({
          error: 'Missing TURN env vars',
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const res = await fetch(
      `https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_SECRET_KEY}`
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Metered API ${res.status}: ${text}`)
    }

    const iceServers = await res.json()

    return new Response(
      JSON.stringify({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          ...iceServers,
        ],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
