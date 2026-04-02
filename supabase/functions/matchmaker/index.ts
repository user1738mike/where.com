import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// Helper to validate UUID format
function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Matchmaker function called with method:', req.method);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check - SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('Environment check - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'Server configuration error: Missing environment variables',
        details: {
          supabaseUrl: !!supabaseUrl,
          supabaseServiceKey: !!supabaseServiceKey
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    console.log('Request body:', body);

    const userId = body.userId;
    const rawEstateId = body.estateId;
    const preferences = body.preferences ?? {};

    // Validate estate_id is a proper UUID, otherwise use null for global matching
    const estateId = isValidUUID(rawEstateId) ? rawEstateId : null;
    console.log('Parsed parameters:', { userId, rawEstateId, estateId, preferences });

    if (!userId) {
      console.log('Missing userId in request');
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check if user already has a pending match and if it has become active
    const { data: existingMatches, error: checkError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('initiator_user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing matches:', checkError);
    } else if (existingMatches && existingMatches.length > 0) {
      const existingMatch = existingMatches[0];
      console.log('User already has pending match, checking if active:', existingMatch.match_id);
      
      // Check if this pending match has become active
      const { data: activeCheck } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('match_id', existingMatch.match_id)
        .eq('status', 'active')
        .limit(1);

      if (activeCheck && activeCheck.length > 0) {
        console.log('Pending match has become active, returning match details');
        // Find the record that has this user as initiator to get the correct peerUserId
        const myRecord = activeCheck.find((r: any) => r.initiator_user_id === userId);
        const peerUserId = myRecord ? myRecord.peer_user_id : activeCheck[0].peer_user_id;
        
        return new Response(JSON.stringify({ 
          matchId: existingMatch.match_id, 
          peerUserId: peerUserId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      console.log('User has pending match but not active yet, continuing search');
      // Continue with the search logic instead of preventing it
    }

    console.log('Attempting to find pending matches...');

    // Clean up stale pending matches first (older than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('matches')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', tenMinutesAgo);

    // Try to find a pending match from another user (only very recent ones to ensure user is still waiting)
    // If estateId is provided, match within the same estate; otherwise, match globally
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    let query = supabaseAdmin
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .neq('initiator_user_id', userId) // Prevent self-matching
      .not('initiator_user_id', 'is', null) // Ensure initiator exists
      .gte('created_at', twoMinutesAgo) // Only match with very recent pending matches
      .order('created_at', { ascending: true }) // Prioritize oldest pending matches first

    if (estateId) {
      // Estate-specific matching
      query = query.eq('estate_id', estateId)
    }
    // If no estateId, match globally (no estate filter)

    console.log('Executing query for pending matches...');
    const { data: pendingMatches, error: pendingError } = await query.limit(1)
    console.log('Query result:', { data: pendingMatches, error: pendingError });

    if (pendingError) {
      console.error('Database query error:', pendingError);
      return new Response(JSON.stringify({
        error: 'Database query failed',
        details: pendingError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (pendingMatches && pendingMatches.length > 0) {
      const found = pendingMatches[0]
      console.log('Found pending match:', found);

      // Verify that the waiting user has an active/confirmed account
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(found.initiator_user_id)

      if (userError || !userData.user) {
        console.log('Waiting user not found or invalid:', found.initiator_user_id);
        // Remove stale pending match and continue to create new one
        await supabaseAdmin.from('matches').delete().eq('id', found.id);
      } else if (userData.user.email_confirmed_at === null) {
        console.log('Waiting user email not confirmed:', found.initiator_user_id);
        // Skip unconfirmed users - remove stale match
        await supabaseAdmin.from('matches').delete().eq('id', found.id);
      } else {
        // User is active and confirmed - proceed with match
        const matchId = found.match_id
        const matchedUserId = found.initiator_user_id

        console.log('Creating match between:', { requester: userId, matched: matchedUserId })
        console.log('Match details before creation:', { matchId, userId, matchedUserId, foundInitiator: found.initiator_user_id });

        // CRITICAL FIX: Double-check we're not matching with ourselves
        if (userId === matchedUserId) {
          console.error('🚨 SELF-MATCH DETECTED! Aborting match creation');
          console.error('Match details:', { userId, matchedUserId, found });
          await supabaseAdmin.from('matches').delete().eq('id', found.id);
          // Continue to create new pending match instead
        } else {
          // Update the existing pending row to become active, set peer_user_id
          const { error: updateError } = await supabaseAdmin
            .from('matches')
            .update({ peer_user_id: userId, status: 'active' })
            .eq('id', found.id)

          if (updateError) {
            console.error('Error updating match:', updateError);
            throw updateError;
          }

          // Insert a new row for the caller representing the same match
          const { data: insertData, error: insertError } = await supabaseAdmin
            .from('matches')
            .insert([
              {
                match_id: matchId,
                estate_id: estateId,
                initiator_user_id: matchedUserId,  // The waiting user should be initiator
                peer_user_id: userId,              // The new user should be peer
                status: 'active',
                metadata: { preferences },
              },
            ])

          if (insertError) {
            console.error('Error inserting match record:', insertError);
            throw insertError;
          }

          console.log('✅ Match created successfully:', { matchId, userId, matchedUserId });
          console.log('Returning match details:', { matchId, peerUserId: matchedUserId, userId, matchedUserId });

          // Allow realtime events to propagate to waiting users
          await new Promise(resolve => setTimeout(resolve, 200));

          return new Response(JSON.stringify({ matchId, peerUserId: matchedUserId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
    }

    // Check if user already has a pending match before creating a new one
    const { data: existingPending, error: existingError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('initiator_user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing pending match:', existingError);
    } else if (existingPending) {
      console.log('User already has a pending match, returning existing match:', existingPending.match_id);
      
      // Check if this pending match has become active
      const { data: activeCheck } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('match_id', existingPending.match_id)
        .eq('status', 'active')
        .limit(1);

      if (activeCheck && activeCheck.length > 0) {
        console.log('Pending match has become active, returning match details');
        return new Response(JSON.stringify({ 
          matchId: existingPending.match_id, 
          peerUserId: activeCheck[0].peer_user_id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        status: 'already_pending', 
        record: existingPending 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // No match found — insert a pending match row for the caller
    console.log('No pending matches found, creating new pending match...');

    // Check again if user already has a pending match (double-check for race conditions)
    const { data: finalCheck, error: finalCheckError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('initiator_user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (finalCheckError) {
      console.error('Final check error:', finalCheckError);
    } else if (finalCheck) {
      console.log('User already has pending match (race condition), returning existing:', finalCheck.match_id);
      
      // Check if this pending match has become active
      const { data: activeCheck } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('match_id', finalCheck.match_id)
        .eq('status', 'active')
        .limit(1);

      if (activeCheck && activeCheck.length > 0) {
        console.log('Pending match has become active, returning match details');
        return new Response(JSON.stringify({ 
          matchId: finalCheck.match_id, 
          peerUserId: activeCheck[0].peer_user_id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        status: 'already_pending', 
        record: finalCheck 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Generate a match_id for the pending match (will be used when matched)
    const pendingMatchId = crypto.randomUUID();

    const insertData = {
      match_id: pendingMatchId,
      estate_id: estateId,
      initiator_user_id: userId,
      status: 'pending',
      metadata: { preferences },
    };

    console.log('Inserting data:', insertData);

    const { data: created, error: createError } = await supabaseAdmin
      .from('matches')
      .insert([insertData])
      .select()

    console.log('Insert result:', { data: created, error: createError });

    if (createError) {
      console.error('Insert error:', createError);
      throw createError;
    }

    console.log('Matchmaker function completed successfully');
    return new Response(JSON.stringify({ status: 'waiting', record: created?.[0] ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
