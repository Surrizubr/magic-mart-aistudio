import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDevMode } from '@/contexts/DevModeContext';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const { devMode } = useDevMode();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (devMode) {
      setUser({
        id: 'dev-user',
        email: 'dev@example.com',
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        role: 'authenticated',
      } as User);
      setLoading(false);
      return;
    }

    // Check current session
    console.log('[Auth] Checking initial session...');
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[Auth] Session check error:', error);
        }
        if (session) {
          console.log('[Auth] Session found for user:', session.user.id);
          setUser(session.user);
        } else {
          console.log('[Auth] No active session found.');
        }
      })
      .catch(err => {
        console.error('[Auth] Unexpected error in getSession:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State changed:', event, session?.user?.id);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [devMode]);

  return { user, loading };
}
