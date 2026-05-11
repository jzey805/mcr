import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { askGraceAIV2 } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  q: string;
  a: string;
  suggestRosterButton?: boolean;
  suggestMembersButton?: boolean;
  suggestTasksButton?: boolean;
}

const GraceAI: React.FC = () => {
  const { t, language } = useLanguage();
  const { church, profile } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  useEffect(() => {
    const fetchManagers = async () => {
      if (!church?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('church_id', church.id)
        .eq('role', 'Manager');
      if (data) setManagers(data);
    };
    fetchManagers();
  }, [church?.id]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const managerNames = managers.map(m => m.full_name).join(', ') || 'No managers data yet';
    const dynamicContext = `System: GraceFlow. 
    Current Church: ${church?.name || 'Unknown'}. 
    Current User: ${profile?.full_name || 'Guest'} (${profile?.role || 'Unknown role'}). 
    Managers in this church: ${managerNames}.
    Features: Roster, Members, Tasks, Giving, Prayer Wall.`;

    setLoading(true);
    const result = await askGraceAIV2(
      question, 
      dynamicContext,
      language
    );
    
    setHistory(prev => [{ 
      q: question, 
      a: result.message, 
      suggestRosterButton: result.suggestRosterButton,
      suggestMembersButton: result.suggestMembersButton,
      suggestTasksButton: result.suggestTasksButton
    }, ...prev]);
    setLoading(false);
    setQuestion('');
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-8 pt-10 pb-6 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined filled text-3xl">smart_toy</span>
          </div>
          <div>
            <h1 className="text-3xl font-serif font-black text-on-surface tracking-tight">Grace Assistant</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-outline opacity-60">AI Church Intelligence</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-8 gap-8">
        <div className="flex-1 overflow-y-auto pr-4 space-y-6 no-scrollbar">
          <AnimatePresence mode="popLayout">
            {history.length === 0 && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="h-full flex flex-col items-center justify-center text-center opacity-40"
               >
                  <span className="material-symbols-outlined text-[80px] mb-4">auto_awesome</span>
                  <h2 className="text-xl font-serif font-bold mb-2">{t('howCanIHelp') || 'How can I help you today?'}</h2>
                  <p className="max-w-xs text-sm">{t('askAbout') || 'Ask about church personnel, service schedules, or theological insights.'}</p>
               </motion.div>
            )}
            
            {history.map((item, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-end">
                  <div className="bg-surface-container-high px-6 py-3 rounded-2xl rounded-tr-none max-w-[80%] border border-outline-variant/10">
                    <p className="text-sm font-medium text-on-surface">{item.q}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined filled text-xl">smart_toy</span>
                  </div>
                  <div className="flex flex-col gap-3 max-w-[85%]">
                    <div className="bg-white px-6 py-4 rounded-3xl rounded-tl-none border border-primary/10 shadow-sm">
                      <p className="text-sm leading-relaxed text-on-surface-variant whitespace-pre-wrap">{item.a}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {item.suggestRosterButton && (
                        <button 
                          onClick={() => navigate('/app/roster')}
                          className="flex items-center gap-2 px-4 py-2 bg-on-surface text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">calendar_month</span>
                          {language.startsWith('zh') ? '前往排班表' : 'Go to Roster'}
                        </button>
                      )}
                      {item.suggestMembersButton && (
                        <button 
                          onClick={() => navigate('/app/members')}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">groups</span>
                          {language.startsWith('zh') ? '查看成员' : 'View Members'}
                        </button>
                      )}
                      {item.suggestTasksButton && (
                        <button 
                          onClick={() => navigate('/app/tasks')}
                          className="flex items-center gap-2 px-4 py-2 bg-tertiary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                          {language.startsWith('zh') ? '查看任务' : 'View Tasks'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-surface-container shrink-0"></div>
              <div className="h-20 w-1/2 bg-surface-container rounded-3xl"></div>
            </div>
          )}
        </div>

        <form onSubmit={handleAsk} className="relative">
          <div className="absolute -top-12 left-0 right-0 flex gap-2 overflow-x-auto no-scrollbar">
            {['checkRoster', 'memberStats', 'prayerList'].map(qKey => (
              <button 
                key={qKey}
                type="button"
                onClick={() => setQuestion(t(qKey))}
                className="whitespace-nowrap px-4 py-1.5 rounded-full bg-white border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest text-outline hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                {t(qKey)}
              </button>
            ))}
          </div>
          <input 
            type="text"
            className="w-full bg-white border-2 border-outline-variant/20 rounded-[32px] py-6 px-8 pr-20 text-md font-medium focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all outline-none shadow-xl"
            placeholder={t('askGrace') || "Ask Grace Assistant..."}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button 
            type="submit"
            disabled={loading || !question.trim()}
            className="absolute right-4 top-4 bottom-4 px-8 rounded-2xl bg-black text-white hover:bg-primary transition-all disabled:opacity-20 shadow-lg shadow-black/10 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-2xl">arrow_upward</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default GraceAI;
