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
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
          ],
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const peerUserId = body.peerUserId

    console.log('get-peer-profile called with peerUserId:', peerUserId)

    if (!peerUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing peerUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Import Supabase client
    const { createClient } = await import('npm:@supabase/supabase-js')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch peer profile using admin client (bypasses RLS)
    console.log('Fetching profile for user_id:', peerUserId)
    const { data: peerProfile, error: profileError } = await supabaseAdmin
      .from('where_profiles')
      .select('full_name, age, interests, estate, user_id')
      .eq('user_id', peerUserId)
      .single()

    console.log('Fetched profile:', { peerProfile, profileError })

    if (profileError) {
      console.error('Error fetching peer profile:', profileError)
      return new Response(
        JSON.stringify({
          error: 'Peer profile not found',
          profile: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        profile: {
          name: peerProfile.full_name,
          age: peerProfile.age,
          interests: peerProfile.interests,
          estate: peerProfile.estate
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('get-peer-profile error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
