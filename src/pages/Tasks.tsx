import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  category: string;
};

const initialTasks: Task[] = [
  { id: '1', title: 'Prepare Prayer List', description: 'Compile the prayer requests for next Tuesday.', dueDate: '2026-05-01', priority: 'high', status: 'pending', category: 'Ministry' },
  { id: '2', title: 'Call Elder David', description: 'Discuss the upcoming fellowship event.', dueDate: '2026-05-02', priority: 'medium', status: 'pending', category: 'Admin' },
  { id: '3', title: 'Practice Guitar', description: 'Songs for Sunday service.', dueDate: '2026-05-03', priority: 'medium', status: 'completed', category: 'Worship' },
  { id: '4', title: 'Update Roster', description: 'Confirm changes with the kitchen team.', dueDate: '2026-05-04', priority: 'low', status: 'pending', category: 'Team' },
];

export default function Tasks() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true;
    return task.status === activeTab;
  });

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  return (
    <div className="flex w-full flex-col bg-surface p-8">
      <header className="mb-12">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">Workspace</h2>
        <h1 className="text-4xl font-serif font-black text-on-surface">{t('myTasks')}</h1>
      </header>

      <div className="flex flex-col gap-8 min-h-0">
        <div className="flex items-center gap-6 border-b border-outline-variant/20 pb-4">
          {[
            { id: 'all', label: t('allTasks') },
            { id: 'pending', label: 'In Progress' },
            { id: 'completed', label: 'Done' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-black uppercase tracking-widest transition-all relative py-2 ${
                activeTab === tab.id ? 'text-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12 content-start">
          <AnimatePresence>
            {filteredTasks.map(task => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={task.id}
                className={`group p-8 rounded-[40px] border-2 transition-all flex flex-col justify-between min-h-[280px] ${
                  task.status === 'completed' 
                    ? 'bg-surface-container-low border-outline-variant/30 opacity-60' 
                    : 'bg-white border-outline-variant/10 hover:border-primary shadow-sm hover:shadow-xl hover:shadow-primary/5'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <span className="px-4 py-1.5 rounded-full bg-surface-container text-[9px] font-black uppercase tracking-widest text-outline">
                      {task.category}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'high' ? 'bg-error' : task.priority === 'medium' ? 'bg-warning' : 'bg-primary'
                    }`} />
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${task.status === 'completed' ? 'line-through text-outline' : 'text-on-surface'}`}>
                    {task.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed opacity-70">
                    {task.description}
                  </p>
                </div>

                <div className="mt-8 flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-tighter text-outline opacity-40 mb-1">Due Date</span>
                    <span className="text-sm font-bold text-on-surface">{task.dueDate}</span>
                  </div>
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      task.status === 'completed' ? 'bg-primary text-white' : 'bg-surface-container hover:bg-primary hover:text-white text-outline'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {task.status === 'completed' ? 'check_circle' : 'circle'}
                    </span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <button className="p-8 rounded-[40px] border-2 border-dashed border-outline-variant/30 hover:border-primary flex flex-col items-center justify-center gap-4 text-outline hover:text-primary transition-all group min-h-[280px]">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
               <span className="material-symbols-outlined text-3xl">add_task</span>
            </div>
            <span className="text-xs font-black uppercase tracking-widest">New Task</span>
          </button>
        </div>
      </div>
    </div>
  );
}
