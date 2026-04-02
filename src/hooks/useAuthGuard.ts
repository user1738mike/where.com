import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthGuardState {
  user: User | null;
  profileCompleted: boolean | null; // null = no profile row exists
  loading: boolean;
}

export const useAuthGuard = (): AuthGuardState => {
  const [state, setState] = useState<AuthGuardState>({
    user: null,
    profileCompleted: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const checkProfile = async (user: User | null) => {
      if (!user) {
        if (!cancelled) setState({ user: null, profileCompleted: null, loading: false });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('where_profiles')
          .select('profile_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cancelled) {
          if (error || !data) {
            setState({ user, profileCompleted: null, loading: false });
          } else {
            setState({ user, profileCompleted: !!data.profile_completed, loading: false });
          }
        }
      } catch {
        if (!cancelled) setState({ user, profileCompleted: null, loading: false });
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      checkProfile(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (!cancelled) {
        setState(prev => ({ ...prev, loading: true }));
        checkProfile(session?.user ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
};
