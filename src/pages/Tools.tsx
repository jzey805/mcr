import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useMode } from '../contexts/ModeContext';

export default function Tools() {
  const { t, language } = useLanguage();
  const { mode } = useMode();
  const [activeTab, setActiveTab] = useState<'finance' | 'newcomers'>('finance');

  // If not manager, don't show the tools or show access denied
  if (mode !== 'Manager') {
    return (
      <div className="flex w-full h-full items-center justify-center bg-surface">
        <div className="text-center p-8 rounded-3xl bg-surface-container-low max-w-sm">
          <span className="material-symbols-outlined text-6xl text-error mb-4">lock</span>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm text-outline">Only managers can view the church administration tools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col bg-surface min-h-full pb-20">
      {/* Header */}
      <div className="p-6 md:p-8 flex flex-col gap-4 border-b border-outline-variant/10 bg-surface">
        <div>
          <h2 className="mb-2 font-headline-md text-on-surface">{language === 'zh' ? '管理工具' : 'Management Tools'}</h2>
          <p className="font-label-sm text-sm text-on-surface-variant uppercase tracking-widest opacity-70">
            {language === 'zh' ? '财务、新朋友及人员分类' : 'Finances, Newcomers & Member Categorization'}
          </p>
        </div>

        <div className="flex gap-4 mt-2">
          <button
            onClick={() => setActiveTab('finance')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'finance'
                ? 'bg-black text-white shadow-lg'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            {language === 'zh' ? '财务点收 (数钱)' : 'Finances / Giving'}
          </button>
          <button
            onClick={() => setActiveTab('newcomers')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'newcomers'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group_add</span>
            {language === 'zh' ? '新朋友 & 人员分类' : 'Newcomers & Assignment'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 max-w-4xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-2">{language === 'zh' ? '本周奉献总额' : 'This Week Total'}</p>
                  <h3 className="text-3xl font-serif font-black text-emerald-800">$0.00</h3>
                </div>
                <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">{language === 'zh' ? '现金记录' : 'Cash Count'}</p>
                  <h3 className="text-3xl font-serif font-black">-</h3>
                </div>
                <button className="flex flex-col items-center justify-center p-6 rounded-3xl bg-black text-white hover:bg-primary transition-all shadow-lg active:scale-95 group">
                  <span className="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform">add_circle</span>
                  <span className="text-[12px] font-black uppercase tracking-widest">{language === 'zh' ? '添加点收记录' : 'Add Record'}</span>
                </button>
              </div>

              <div className="bg-white border border-outline-variant/30 p-8 rounded-[32px] shadow-sm">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">receipt_long</span>
                  {language === 'zh' ? '近期记录' : 'Recent Records'}
                </h3>
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-4xl text-outline/30 mb-2">inbox</span>
                  <p className="text-outline text-sm font-medium">{language === 'zh' ? '暂无奉献记录' : 'No records yet'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'newcomers' && (
            <motion.div
              key="newcomers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 max-w-6xl"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                   <h3 className="text-lg font-bold">{language === 'zh' ? '待分类新成员 (New members tracking)' : 'Uncategorized Members'}</h3>
                   <p className="text-xs text-outline">{language === 'zh' ? '所有新注册的用户默认是 "Member"，经管理员跟进后可归类至具体小组或赋予 "Leader/Staff" 权限。' : 'New users are "Member" by default. Managers can verify them and assign them to groups or roles.'}</p>
                </div>
              </div>

              <div className="bg-white border border-outline-variant/30 rounded-[32px] shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-outline uppercase tracking-widest">{language === 'zh' ? '姓名' : 'Name'}</th>
                      <th className="p-4 text-[10px] font-black text-outline uppercase tracking-widest">{language === 'zh' ? '注册时间' : 'Joined'}</th>
                      <th className="p-4 text-[10px] font-black text-outline uppercase tracking-widest">{language === 'zh' ? '当前权限' : 'Role'}</th>
                      <th className="p-4 text-[10px] font-black text-outline uppercase tracking-widest">{language === 'zh' ? '操作' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 font-bold flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">J</div>
                         Jane Doe
                      </td>
                      <td className="p-4 text-xs font-medium text-outline">Today</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-surface-container border border-outline-variant/20 rounded-md text-[10px] font-bold uppercase">Member</span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => alert(language === 'zh' ? '调整组别与角色模态框...' : 'Change Assignment...')} className="px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-colors">
                          {language === 'zh' ? '去分类' : 'Categorize'}
                        </button>
                      </td>
                    </tr>
                    {/* Placeholder for no more data */}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
