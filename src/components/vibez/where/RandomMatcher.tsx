import { useRef, useState, forwardRef, useImperativeHandle, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RandomMatcherProps {
  onMatched?: (matchId: string) => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

const STALE_MATCH_AGE_MS = 2 * 60 * 1000; // 2 minutes
const POLLING_TIMEOUT_MS = 60 * 1000; // 60 seconds

const RandomMatcher = forwardRef(function RandomMatcher({ onMatched }: RandomMatcherProps, ref: any) {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const channelRef = useRef<any | null>(null);
  const notificationSentRef = useRef<boolean>(false);
  const [, setErrorMsg] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const showNotification = useCallback(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Neighbor Match Found! 🎉', {
            body: 'A neighbor is ready to connect! Click to start your video chat.',
            requireInteraction: true
          });
          window.focus();
        }
      });
    } else if (Notification.permission === 'granted') {
      new Notification('Neighbor Match Found! 🎉', {
        body: 'A neighbor is ready to connect! Click to start your video chat.',
        icon: '/favicon.ico',
        requireInteraction: true
      });
      window.focus();
    }
  }, []);

  const cleanupPolling = useCallback(() => {
    if (channelRef.current) {
      if (channelRef.current.clearPolling) {
        channelRef.current.clearPolling();
      } else {
        try { supabase.removeChannel(channelRef.current); } catch {}
      }
      channelRef.current = null;
    }
  }, []);

  const startSearch = useCallback(async () => {
    setErrorMsg(null);
    notificationSentRef.current = false;
    
    if (loading) {
      setErrorMsg('Auth still initializing — please wait a moment and try again.');
      return;
    }

    if (!user) {
      setErrorMsg('Please sign in to use random matching.');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const testUserId = urlParams.get('testUser');
    const currentUserId = testUserId || user.id;

    setStatus('searching');

    try {
      // Get user's estate
      let estateId: string | null = null;
      try {
        const { data: profile, error } = await supabase
          .from('where_profiles')
          .select('estate_id, estate')
          .eq('user_id', currentUserId)
          .single();

        const candidate = profile?.estate_id ?? profile?.estate;
        if (!error && isValidUUID(candidate)) {
          estateId = candidate;
        }
      } catch {}

      const body = { userId: currentUserId, estateId, preferences: {} };
      const res = await supabase.functions.invoke('matchmaker', { body });

      if (res.error) {
        console.error('RandomMatcher: Matchmaker error:', res.error);
        
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('*')
          .eq('initiator_user_id', currentUserId)
          .eq('status', 'pending')
          .maybeSingle();
        
        if (existingMatch?.match_id) {
          // Check staleness
          const age = Date.now() - new Date(existingMatch.created_at).getTime();
          if (age > STALE_MATCH_AGE_MS) {
            console.log('RandomMatcher: Deleting stale pending match:', existingMatch.match_id);
            await supabase.from('matches').delete().eq('id', existingMatch.id);
            // Retry
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              setStatus('idle');
              setTimeout(() => startSearch(), 500);
              return;
            }
          } else {
            console.log('RandomMatcher: Resuming existing pending match:', existingMatch.match_id);
            startPolling(existingMatch.match_id, currentUserId);
            return;
          }
        }
        
        setErrorMsg(res.error.message || 'Matchmaker service error');
        setStatus('idle');
        return;
      }
      
      const data = res.data;
      console.log('RandomMatcher: Matchmaker response:', data);
      retryCountRef.current = 0;

      // Handle "already_pending"
      if (data.status === 'already_pending' && data.record?.match_id) {
        const createdAt = data.record.created_at || data.record.inserted_at;
        const age = createdAt ? Date.now() - new Date(createdAt).getTime() : Infinity;

        if (age > STALE_MATCH_AGE_MS) {
          console.log('RandomMatcher: Stale already_pending match (age:', Math.round(age / 1000), 's), deleting and retrying');
          await supabase.from('matches').delete().eq('id', data.record.id);
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            setStatus('idle');
            setTimeout(() => startSearch(), 500);
            return;
          }
        }

        // Check if already active
        const { data: existingRecords } = await supabase
          .from('matches')
          .select('*')
          .eq('match_id', data.record.match_id);
        
        const activeRecords = existingRecords?.filter((r: any) => r.status === 'active');
        if (activeRecords && activeRecords.length > 0) {
          console.log('RandomMatcher: Match already active');
          showNotification();
          setStatus('matched');
          onMatched?.(data.record.match_id);
        } else {
          startPolling(data.record.match_id, currentUserId);
        }
        return;
      }

      // Immediate match
      if (data.matchId) {
        console.log('RandomMatcher: Immediate match found:', data.matchId);
        showNotification();
        setStatus('matched');
        onMatched?.(data.matchId);
        return;
      }

      // Waiting
      if (data.status === 'waiting' && data.record?.match_id) {
        startPolling(data.record.match_id, currentUserId);
      }
    } catch (e) {
      console.error('RandomMatcher: Matchmaker error', e);
      setErrorMsg(String(e));
      setStatus('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, showNotification, onMatched]);

  const startPolling = useCallback((matchId: string, currentUserId: string) => {
    console.log('RandomMatcher: Polling for matchId:', matchId);
    cleanupPolling();

    const startTime = Date.now();

    const performPoll = async () => {
      // Check polling timeout
      if (Date.now() - startTime > POLLING_TIMEOUT_MS) {
        console.log('RandomMatcher: Polling timeout reached (60s), cleaning up and retrying');
        cleanupPolling();
        // Delete stale pending match
        await supabase.from('matches').delete().eq('match_id', matchId).eq('initiator_user_id', currentUserId).eq('status', 'pending');
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setStatus('idle');
          setTimeout(() => startSearch(), 1000);
        } else {
          setErrorMsg('Could not find a match. Please try again.');
          setStatus('idle');
        }
        return true; // signal to stop polling
      }

      try {
        const { data: records, error } = await supabase
          .from('matches')
          .select('*')
          .eq('match_id', matchId);

        if (error) {
          console.error('Polling error:', error);
          return false;
        }
        
        const activeRecords = records?.filter((r: any) => r.status === 'active');
        
        if (activeRecords && activeRecords.length > 0 && !notificationSentRef.current) {
          console.log('RandomMatcher: Match activated, matchId:', matchId);
          notificationSentRef.current = true;
          showNotification();
          setStatus('matched');
          onMatched?.(matchId);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Polling failed:', err);
        return false;
      }
    };

    performPoll().then((done) => {
      if (done) return;

      const pollInterval = setInterval(async () => {
        const done = await performPoll();
        if (done) clearInterval(pollInterval);
      }, 500);

      channelRef.current = {
        isPolling: true,
        clearPolling: () => {
          clearInterval(pollInterval);
          channelRef.current = null;
        }
      };
    });
  }, [cleanupPolling, showNotification, onMatched, startSearch]);

  const stopSearch = useCallback(() => {
    setStatus('idle');
    cleanupPolling();
  }, [cleanupPolling]);

  useEffect(() => {
    if (user && !loading && status === 'idle') {
      console.log('RandomMatcher: Auto-starting search on mount');
      retryCountRef.current = 0;
      startSearch();
    }
  }, [user?.id, loading, status, startSearch]);

  useImperativeHandle(ref, () => ({
    startSearch,
    stopSearch,
    getStatus: () => status,
  }));

  return null;
});

export default RandomMatcher;
