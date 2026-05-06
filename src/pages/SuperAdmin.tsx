import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { churchService, Church } from '../services/churchService';
import { useLanguage } from '../contexts/LanguageContext';

const MOCK_CHURCHES: Church[] = [
  { id: '1', name: 'Grace Community Sydney', code: 'GRACE-SYD', domain: 'sydney.mcr.com', member_count: 156, created_at: new Date().toISOString() },
  { id: '2', name: 'Calvary Chapel Life', code: 'CALV-01', domain: 'life.calvary.org', member_count: 89, created_at: new Date().toISOString() },
  { id: '3', name: 'Emmanuel Baptist', code: 'EBA-MAIN', member_count: 312, created_at: new Date().toISOString() },
];

export default function SuperAdmin() {
  const { profile, switchChurch } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'Super Admin') return;

    const fetchChurches = async () => {
      try {
        const data = await churchService.getAllChurches();
        if (data.length === 0 && profile.id === 'super-admin-id') {
           setChurches(MOCK_CHURCHES);
        } else {
           setChurches(data);
        }
      } catch (err) {
        console.error('Error fetching churches:', err);
        if (profile.id === 'super-admin-id') setChurches(MOCK_CHURCHES);
      } finally {
        setLoading(false);
      }
    };

    fetchChurches();
  }, [profile]);

  const handleManageChurch = (church: Church) => {
    switchChurch(church);
    navigate('/app'); // Jump to dashboard as that church
  };

  if (profile?.role !== 'Super Admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-outline font-bold uppercase tracking-widest text-xs">Access Denied: Super Admin Only</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-on-surface tracking-tight font-serif italic mb-2">Super Admin Dashboard</h1>
        <p className="text-sm font-bold text-outline uppercase tracking-[0.2em]">Platform Overview & Tenant Management</p>
      </header>

      {loading ? (
        <div className="flex gap-4 items-center animate-pulse">
           <div className="w-12 h-12 rounded-full bg-surface-container"></div>
           <div className="h-4 w-48 bg-surface-container rounded"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {churches.map((church) => (
            <motion.div 
              key={church.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-container-low rounded-[32px] p-8 border border-outline-variant/10 shadow-xl hover:shadow-2xl transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">church</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-surface-container-high text-[10px] font-black text-outline uppercase">
                   {church.code}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-on-surface mb-1">{church.name}</h3>
              <p className="text-xs text-outline font-medium mb-6">
                 {church.domain ? `Domain: ${church.domain}` : 'No Custom Domain'}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-outline-variant/30">
                <div>
                  <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Members</p>
                  <p className="text-lg font-black text-on-surface">{church.member_count}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <p className="text-xs font-bold text-on-surface">Active</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-2">
                <button 
                  onClick={() => handleManageChurch(church)}
                  className="flex-1 py-3 rounded-xl bg-surface-container-high text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-primary hover:text-white transition-all"
                >
                  Manage & Enter
                </button>
                <button className="p-3 rounded-xl bg-surface-container-high text-outline hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-sm">settings</span>
                </button>
              </div>
            </motion.div>
          ))}

          {/* Add New Church Card */}
          <button className="bg-surface-container-low rounded-[32px] p-8 border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-surface-container-high/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-outline-variant/20 flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-white transition-all">
               <span className="material-symbols-outlined">add</span>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-outline group-hover:text-primary">Add New Church</p>
          </button>
        </div>
      )}
    </div>
  );
}
