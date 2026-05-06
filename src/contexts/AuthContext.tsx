import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  church: any | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
  loginAsGuest: () => void;
  loginAsSuperAdmin: () => void;
  switchChurch: (church: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  church: null,
  signOut: async () => {},
  isLoading: true,
  loginAsGuest: () => {},
  loginAsSuperAdmin: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [church, setChurch] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileAndChurch = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, churches(*)')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      
      if (profileData) {
        setProfile(profileData);
        setChurch(profileData.churches);
      }
    } catch (err) {
      console.error('Error fetching profile/church:', err);
    }
  };

  useEffect(() => {
    // Get active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndChurch(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndChurch(session.user.id);
      } else {
        setProfile(null);
        setChurch(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && profile) {
      setIsLoading(false);
    } else if (!session && !isLoading) {
      // Do nothing, already stopped loading
    }
  }, [session, profile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setChurch(null);
  };

  const loginAsGuest = () => {
    const guestUser = {
      id: 'guest-id',
      email: 'guest@example.com',
      user_metadata: { full_name: 'Guest User' },
    } as any;
    
    setUser(guestUser);
    setProfile({ role: 'Member' });
    setChurch({ name: 'Guest Church' });
    setSession({ user: guestUser, access_token: 'fake', refresh_token: 'fake', expires_in: 3600, token_type: 'bearer' } as any);
  };

  const loginAsSuperAdmin = () => {
    const adminUser = {
      id: 'super-admin-id',
      email: 'admin@mcr.com',
      user_metadata: { full_name: 'Super Admin Demo' },
    } as any;
    
    setUser(adminUser);
    setProfile({ role: 'Super Admin', full_name: 'Super Admin Demo' });
    setChurch({ id: 'demo-church-id', name: 'Global Ministry Console' });
    setIsLoading(false);
    setSession({ user: adminUser, access_token: 'demo-token', refresh_token: 'demo-refresh', expires_in: 3600, token_type: 'bearer' } as any);
  };

  const switchChurch = (newChurch: any) => {
    if (profile?.role === 'Super Admin') {
      setChurch(newChurch);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, church, signOut, isLoading, loginAsGuest, loginAsSuperAdmin, switchChurch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
