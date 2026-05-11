import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { churchService } from '../services/churchService';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  church: any | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
  switchChurch: (church: any) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [church, setChurch] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileAndChurch = async (userId: string, userEmail?: string) => {
    const normalizedEmail = userEmail?.toLowerCase()?.trim();
    let currentProfile: any = null;
    
    // Check cache first to provide immediate feedback, but don't set isLoading(false) 
    // unless we are absolutely sure the session is stable.
    const cachedProfile = localStorage.getItem(`profile_${userId}`);
    const cachedChurch = localStorage.getItem(`church_${userId}`);
    
    if (cachedProfile) {
      try {
        currentProfile = JSON.parse(cachedProfile);
        setProfile(currentProfile);
        if (cachedChurch) {
          setChurch(JSON.parse(cachedChurch));
        }
      } catch (e) {
        console.error('Failed to parse cached profile');
      }
    }

    // Force Super Admin role for developers while maintaining their DB profile integrity
    const isDeveloper = normalizedEmail === 'jzey805@gmail.com' || normalizedEmail === 'hyy7010@gmail.com';
    
    try {
      console.log('Fetching profile for:', userId);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // If we are developer, ensure we have a functional fallback profile
        if (isDeveloper) {
          setProfile({ role: 'Super Admin', full_name: 'Platform Admin' });
        }
        return; 
      }
      
    if (profileData) {
        let finalProfile = profileData;
        // Ensure developer stays Super Admin but keeps their church_id and data from DB
        if (isDeveloper) {
          finalProfile = { ...profileData, role: 'Super Admin' };
        }
        setProfile(finalProfile);
        localStorage.setItem(`profile_${userId}`, JSON.stringify(finalProfile));

        // If Super Admin was viewing a specific church, restore it
        if (isDeveloper) {
          const stored = localStorage.getItem(`super_admin_viewing_church`);
          if (stored) {
            try {
              setChurch(JSON.parse(stored));
            } catch (e) {}
          }
        }

        if (profileData.church_id && !isDeveloper) { // Non-admin: use their linked church
            const { data: churchData } = await supabase
              .from('churches')
              .select('*')
              .eq('id', profileData.church_id)
              .maybeSingle();

            if (churchData) {
              setChurch(churchData);
              localStorage.setItem(`church_${userId}`, JSON.stringify(churchData));
            }
        }
      } else {
        // NOT FOUND in DB - Only set fallback if developer
        if (isDeveloper) {
          const fallbackAdmin = { role: 'Super Admin', full_name: 'Platform Admin' };
          setProfile(fallbackAdmin);
        } else {
          setProfile({ role: 'Pending' });
        }
      }
    } catch (err) {
      console.error('Error in fetchProfileAndChurch:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndChurch(user.id, user.email);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        // Global safety timeout
        const initTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('Auth initialization timeout');
            setIsLoading(false);
          }
        }, 20000);

        // 1. Get session from local storage / cookie
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (initialSession) {
            // 2. CRITICAL: Forcefully check with server if the user actually still exists
            // This prevents deleted users from staying logged in via cached sessions
            const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !serverUser) {
              console.log('User no longer exists on server, clearing session');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setProfile(null);
              setChurch(null);
              setIsLoading(false);
              clearTimeout(initTimeout);
              return;
            }

            setSession(initialSession);
            setUser(serverUser);
            
            console.log('Session verified, fetching profile...', serverUser.email);
            fetchProfileAndChurch(serverUser.id, serverUser.email).finally(() => {
              if (mounted) {
                clearTimeout(initTimeout);
                setIsLoading(false);
              }
            });
          } else {
            console.log('No session found');
            setIsLoading(false);
            clearTimeout(initTimeout);
          }
        }
      } catch (err) {
        console.error('Initial check error:', err);
        if (mounted) setIsLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', _event, session?.user?.email);
      setSession(session);
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        await fetchProfileAndChurch(newUser.id, newUser.email);
        if (mounted) setIsLoading(false);
      } else {
        setProfile(null);
        setChurch(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (user) {
      localStorage.removeItem(`profile_${user.id}`);
    }
    localStorage.removeItem(`super_admin_viewing_church`);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setChurch(null);
  };

  const switchChurch = (newChurch: any) => {
    if (profile?.role === 'Super Admin' || profile?.role === 'SuperAdmin') {
      setChurch(newChurch);
      if (newChurch) {
        localStorage.setItem(`super_admin_viewing_church`, JSON.stringify(newChurch));
      } else {
        localStorage.removeItem(`super_admin_viewing_church`);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, church, signOut, isLoading, switchChurch, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
