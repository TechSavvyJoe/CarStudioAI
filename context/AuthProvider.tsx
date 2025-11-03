import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, getProfileById, type UserProfile } from '../services/auth';
import { logger } from '../utils/logger';

interface AuthContextType {
  loading: boolean;
  user: UserProfile | null;
}

const AuthContext = createContext<AuthContextType>({ loading: true, user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        logger.log('[AuthProvider] Checking initial session...');
        // Check session first before fetching profile
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logger.error('[AuthProvider] Session check failed:', error.message);
          // Don't throw - just set user to null
          if (mounted) setUser(null);
        } else if (session) {
          logger.log('[AuthProvider] Session found, fetching profile for user:', session.user.id);
          try {
            const profile = await getProfileById(session.user.id, session.user.email);
            logger.log('[AuthProvider] Profile fetched:', profile);
            if (mounted) setUser(profile);
          } catch (profileErr) {
            logger.error('[AuthProvider] Failed to fetch profile:', profileErr);
            // User exists but no profile - this shouldn't happen with triggers
            if (mounted) setUser(null);
          }
        } else {
          logger.log('[AuthProvider] No session found');
          if (mounted) setUser(null);
        }
      } catch (err) {
        logger.error('[AuthProvider] Unexpected error:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log('[AuthProvider] Auth state changed:', event, 'session:', !!session);
      setLoading(true);
      try {
        if (session) {
          logger.log('[AuthProvider] Fetching profile after auth change...');
          const profile = await getProfileById(session.user.id, session.user.email);
          logger.log('[AuthProvider] Profile after auth change:', profile);
          setUser(profile);
        } else {
          logger.log('[AuthProvider] No session after auth change');
          setUser(null);
        }
      } catch (err) {
        logger.error('[AuthProvider] Profile update failed after auth change:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ loading, user }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
