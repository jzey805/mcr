import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type Mode = 'Manager' | 'Staff' | 'Member';

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [mode, setModeState] = useState<Mode>(() => {
    const saved = localStorage.getItem('app_mode');
    return (saved as Mode) || 'Member';
  });

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem('app_mode', newMode);
    localStorage.setItem('mode_manually_set', 'true');
  };

  useEffect(() => {
    const isNewUser = !localStorage.getItem('app_mode');
    if (profile?.role && isNewUser) {
      if (profile.role === 'Admin' || profile.role === 'Leader' || profile.role === 'Super Admin' || profile.role === 'Manager') {
        setModeState('Manager');
        localStorage.setItem('app_mode', 'Manager');
      } else {
        setModeState('Member');
        localStorage.setItem('app_mode', 'Member');
      }
      // Mark as initialized so we don't overwrite user's manual choice later
      localStorage.setItem('mode_manually_set', 'true');
    }
  }, [profile?.role]); // Only trigger when role STRING changes, not the whole profile object

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) throw new Error('useMode must be used within a ModeProvider');
  return context;
}
