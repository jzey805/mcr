import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Songs from './pages/Songs';
import Roster from './pages/Roster';
import Giving from './pages/Giving';
import Members from './pages/Members';
import GraceAI from './pages/GraceAI';
import PrayerWall from './pages/PrayerWall';
import About from './pages/About';
import Tasks from './pages/Tasks';
import ActivityLog from './pages/ActivityLog';
import ReadyPPT from './pages/ReadyPPT';
import Groups from './pages/Groups';
import ProfilePage from './pages/Profile';
import SuperAdmin from './pages/SuperAdmin';
import Tools from './pages/Tools';
import PendingApproval from './pages/PendingApproval';
import Approvals from './pages/Approvals';
import { ModeProvider } from './contexts/ModeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, isLoading, user } = useAuth();
  
  // Developer bypass: If this is a known developer/admin account, bypass the blocking loading screen
  // to prevent getting stuck if Supabase is being slow/unreliable.
  const isDev = user?.email?.toLowerCase() === 'jzey805@gmail.com' || user?.email?.toLowerCase() === 'hyy7010@gmail.com';
  if (isDev) {
    return <>{children}</>;
  }
  
  if (isLoading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-outline animate-pulse">Initializing GraceFlow...</p>
        </div>
      </div>
    );
  }
  
  if (!session && !isLoading) {
    return <Navigate to="/" replace />;
  }

  if (profile?.role === 'Pending') {
    return <PendingApproval />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ModeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="about" element={<About />} />
                <Route path="songs" element={<Songs />} />
                <Route path="roster" element={<Roster />} />
                <Route path="members" element={<Members />} />
                <Route path="ai" element={<GraceAI />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="giving" element={<Giving />} />
                <Route path="groups" element={<Groups />} />
                <Route path="prayer" element={<PrayerWall />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="activity" element={<ActivityLog />} />
                <Route path="ready" element={<ReadyPPT />} />
                <Route path="tools" element={<Tools />} />
                <Route path="approvals" element={<Approvals />} />
                <Route path="super-admin" element={<SuperAdmin />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ModeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
