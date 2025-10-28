import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, getProfile, type UserProfile } from '../services/auth';

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
        const profile = await getProfile();
        if (mounted) setUser(profile);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      setLoading(true);
      try {
        const profile = await getProfile();
        setUser(profile);
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
