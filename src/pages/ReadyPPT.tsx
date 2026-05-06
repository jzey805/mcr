import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface PPTItem {
  id: string;
  name: string;
  type: 'weekly' | 'song' | 'sermon';
  date: string;
  size: string;
  songCount?: number;
  preacher?: string;
  title?: string;
}

const INITIAL_PPT_LIBRARY: PPTItem[] = [
  { id: 'p1', name: 'Ready_PPT_Sunday_Worship_2024-05-01', type: 'weekly', date: '2024-05-01', songCount: 4, size: '4.2MB' },
  { id: 'p2', name: 'Amazing_Grace_Standard', type: 'song', date: '2024-04-28', title: '奇异恩典', size: '1.1MB' },
  { id: 'p3', name: 'Sermon_Living_By_Faith', type: 'sermon', date: '2024-05-01', preacher: 'Ps. David', size: '2.8MB' },
  { id: 'p4', name: 'Ready_PPT_Youth_Night_2024-04-26', type: 'weekly', date: '2024-04-26', songCount: 3, size: '3.5MB' },
  { id: 'p5', name: 'How_Great_Is_Our_God_V2', type: 'song', date: '2024-04-20', title: '我神真伟大', size: '1.2MB' },
  { id: 'p6', name: 'Sermon_The_Power_of_Prayer', type: 'sermon', date: '2024-04-24', preacher: 'Ps. Sarah', size: '2.1MB' },
];

export default function ReadyPPT() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'weekly' | 'song' | 'sermon'>('all');
  const [search, setSearch] = useState('');
  const [library, setLibrary] = useState(INITIAL_PPT_LIBRARY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [noti, setNoti] = useState<string | null>(null);

  const filteredLibrary = library.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         (item.title && item.title.toLowerCase().includes(search.toLowerCase())) ||
                         (item.preacher && item.preacher.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleDelete = (id: string) => {
    setLibrary(library.filter(p => p.id !== id));
    setNoti("文件已从库中移除");
    setTimeout(() => setNoti(null), 2000);
  };

  const startEditing = (item: PPTItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const saveName = () => {
    if (editingId) {
      setLibrary(library.map(p => p.id === editingId ? { ...p, name: editName } : p));
      setEditingId(null);
      setNoti("文件名已更新");
      setTimeout(() => setNoti(null), 2000);
    }
  };

  const handleManualUpload = (type: 'weekly' | 'song' | 'sermon') => {
    const newName = type === 'weekly' ? `Manual_Weekly_${new Date().toLocaleDateString()}` : 
                    type === 'song' ? 'Manual_Song_Upload' : 'Sermon_Handout_Upload';
    const newItem: PPTItem = {
      id: `m-${Date.now()}`,
      name: newName,
      type,
      date: new Date().toISOString().split('T')[0],
      size: '1.5MB'
    };
    setLibrary([newItem, ...library]);
    setIsUploading(false);
    setNoti(`成功上传了一个 ${type} 资源`);
    setTimeout(() => setNoti(null), 2000);
  };

  const handleDownload = (item: PPTItem) => {
    setNoti(`准备下载 ${item.name}...`);
    
    setTimeout(() => {
      const element = document.createElement('a');
      const file = new Blob(['Simulated Content'], {type: 'application/octet-stream'});
      element.href = URL.createObjectURL(file);
      element.download = `${item.name}.${item.type === 'sermon' ? 'pdf' : 'pptx'}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      setNoti("✅ 下载已开始");
      setTimeout(() => setNoti(null), 2000);
    }, 800);
  };

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full min-h-full pb-32">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.5em] font-sans">Resources Cloud Repository</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-[64px] font-serif font-black text-[#2C2C2C] tracking-tighter leading-none">
              Ready <span className="text-emerald-500/80 italic font-medium">PPT</span> Library
            </h1>
            <p className="text-sm text-outline/40 max-w-lg font-medium leading-relaxed">
              这里是教会的敬拜资源云端中心。所有已编排的 PPT、单曲资源和讲道大纲都会在此自动存档，供 IT 和敬拜团队随时下载与预览。
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
           <div className="flex items-center gap-4 bg-white p-3 pl-6 rounded-[28px] border border-[#E5E0DA]/50 shadow-xl shadow-black/[0.02] w-full sm:w-96 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <span className="material-symbols-outlined text-outline/30 text-[20px]">search_insight</span>
              <input 
                type="text" 
                placeholder="搜索文件、歌名或讲员..."
                className="w-full bg-transparent border-none outline-none text-xs font-bold p-1 focus:ring-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           <button 
             onClick={() => setIsUploading(true)}
             className="h-16 w-16 rounded-[24px] bg-black text-white flex items-center justify-center hover:bg-emerald-600 hover:rotate-90 transition-all shadow-2xl shadow-black/10 shrink-0"
           >
              <span className="material-symbols-outlined text-3xl">add</span>
           </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-16">
        <div className="h-px bg-[#E5E0DA]/50 flex-1 hidden md:block"></div>
        <div className="flex gap-2 p-1.5 bg-white rounded-[28px] border border-[#E5E0DA]/40 shadow-sm">
           {[
             { id: 'all', label: t('allFiles'), icon: 'all_inclusive' },
             { id: 'weekly', label: t('weeklyWorshipPpt'), icon: 'calendar_month' },
             { id: 'song', label: t('songSelectionPpt'), icon: 'lyrics' },
             { id: 'sermon', label: t('sermonOutline'), icon: 'auto_stories' }
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setFilter(tab.id as any)}
               className={`px-8 py-4 rounded-[22px] flex items-center gap-3 transition-all relative ${filter === tab.id ? 'bg-black text-white shadow-2xl scale-105' : 'text-outline/40 hover:text-outline/80 hover:bg-[#F9F7F5]'}`}
             >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
             </button>
           ))}
        </div>
        <div className="h-px bg-[#E5E0DA]/50 flex-1 hidden md:block"></div>
      </div>

      {/* Library Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence mode="popLayout">
          {filteredLibrary.length > 0 ? (
            filteredLibrary.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-white rounded-[44px] border border-[#E5E0DA]/30 p-10 hover:shadow-[0_45px_100px_-25px_rgba(0,0,0,0.12)] hover:border-emerald-500/30 transition-all duration-700 flex flex-col"
              >
                 <div className="flex justify-between items-start mb-10">
                    <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ${item.type === 'weekly' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : item.type === 'song' ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-orange-500 text-white shadow-orange-500/20'}`}>
                      <span className="material-symbols-outlined text-4xl">
                         {item.type === 'weekly' ? 'auto_awesome_motion' : item.type === 'song' ? 'mic_external_on' : 'edit_document'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${item.type === 'weekly' ? 'bg-emerald-50 text-emerald-600' : item.type === 'song' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                         {item.type}
                       </span>
                       <span className="text-[10px] font-black text-outline/30">{item.size}</span>
                    </div>
                 </div>

                 <div className="flex-1">
                    {editingId === item.id ? (
                      <div className="mb-6 space-y-3">
                        <input 
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={saveName}
                          onKeyDown={(e) => e.key === 'Enter' && saveName()}
                          className="w-full bg-[#F9F7F5] border-2 border-emerald-500/30 rounded-2xl px-6 py-4 text-sm font-black text-[#2C2C2C] focus:ring-0 mb-2"
                        />
                        <div className="flex items-center gap-2 text-emerald-500">
                           <span className="material-symbols-outlined text-[14px]">info</span>
                           <p className="text-[8px] font-black uppercase tracking-widest">{t('filenameUpdated')} · ENTER</p>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => startEditing(item)}
                        className="group/title cursor-pointer mb-4"
                      >
                         <h4 className="text-[22px] font-serif font-black text-[#2C2C2C] leading-snug group-hover:text-emerald-600 transition-colors">
                           {item.name}
                         </h4>
                         <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-sm text-emerald-500">edit</span>
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">{t('filenameUpdated')}</span>
                         </div>
                      </div>
                    )}
 
                    <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-[#E5E0DA]/30">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-outline/30 uppercase tracking-widest">{t('entryDate')}</p>
                          <p className="text-[11px] font-bold text-[#2C2C2C]">{item.date}</p>
                       </div>
                       {item.songCount ? (
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-outline/30 uppercase tracking-widest">{t('songIncluded')}</p>
                            <p className="text-[11px] font-bold text-[#2C2C2C]">{item.songCount} {t('songIncluded')}</p>
                         </div>
                       ) : item.preacher ? (
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-outline/30 uppercase tracking-widest">{t('sharePerson')}</p>
                            <p className="text-[11px] font-bold text-[#2C2C2C]">{item.preacher}</p>
                         </div>
                       ) : (
                         <div className="space-y-1 text-right">
                            <p className="text-[8px] font-black text-outline/30 uppercase tracking-widest">{t('storageLocation')}</p>
                            <p className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                               <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                               Global Cloud
                            </p>
                         </div>
                       )}
                    </div>
                 </div>
 
                 <div className="mt-12 flex gap-3">
                    <button className="flex-1 py-5 bg-[#F9F7F5] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm active:scale-95">
                      {t('onlinePreview')}
                    </button>
                    <button 
                      onClick={() => handleDownload(item)}
                      className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-lg">download</span>
                      {t('downloadFile')}
                    </button>
                 </div>

                 {/* Delete Interaction */}
                 <div className="absolute top-8 left-8 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="h-10 w-10 rounded-full flex items-center justify-center text-outline/20 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">delete_sweep</span>
                    </button>
                 </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-40 text-center bg-white rounded-[56px] border-2 border-dashed border-[#E5E0DA]/50">
               <div className="w-24 h-24 rounded-full bg-[#F9F7F5] flex items-center justify-center mx-auto mb-8 text-outline/10">
                 <span className="material-symbols-outlined text-5xl">folder_off</span>
               </div>
               <h3 className="text-2xl font-serif font-black text-outline/40 uppercase tracking-widest">未发现匹配资源</h3>
               <p className="text-sm font-bold text-outline/20 mt-4 max-w-xs mx-auto">请尝试更换搜索词或直接上传您的 PPT 文件到数据库中。</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal Overlay */}
      <AnimatePresence>
        {isUploading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsUploading(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="relative bg-[#F9F7F5] w-full max-w-4xl rounded-[56px] overflow-hidden shadow-2xl p-12 lg:p-20"
             >
                <div className="flex flex-col lg:flex-row gap-16">
                   <div className="flex-1 space-y-8">
                      <div className="space-y-2">
                        <h2 className="text-4xl font-serif font-black text-[#2C2C2C] tracking-tighter italic">Upload Resource</h2>
                        <p className="text-sm text-outline/40 font-medium">请将您的 PPT 文件拖入下方或点击选择分类进行录入。</p>
                      </div>

                      <div className="border-4 border-dashed border-[#E5E0DA] rounded-[44px] aspect-video flex flex-col items-center justify-center group hover:border-emerald-500/30 hover:bg-emerald-50/30 transition-all cursor-pointer">
                         <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-outline/20 shadow-sm group-hover:text-emerald-500 group-hover:scale-110 transition-all mb-6">
                            <span className="material-symbols-outlined text-4xl">upload_file</span>
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-outline/40 group-hover:text-emerald-600">Drag & Drop Files Here</p>
                      </div>
                   </div>

                   <div className="w-px bg-[#E5E0DA] hidden lg:block"></div>

                   <div className="w-full lg:w-80 space-y-10">
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]">选择资源分类</h4>
                         <div className="space-y-3">
                            <button onClick={() => handleManualUpload('weekly')} className="w-full p-6 bg-white rounded-[24px] border border-[#E5E0DA]/50 flex items-center gap-4 hover:border-emerald-500/30 hover:shadow-lg transition-all group">
                               <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                  <span className="material-symbols-outlined">event_repeat</span>
                               </div>
                               <span className="text-xs font-black uppercase tracking-widest">本周敬拜 PPT</span>
                            </button>
                            <button onClick={() => handleManualUpload('song')} className="w-full p-6 bg-white rounded-[24px] border border-[#E5E0DA]/50 flex items-center gap-4 hover:border-indigo-500/30 hover:shadow-lg transition-all group">
                               <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  <span className="material-symbols-outlined">music_note</span>
                               </div>
                               <span className="text-xs font-black uppercase tracking-widest">单曲歌库 PPT</span>
                            </button>
                            <button onClick={() => handleManualUpload('sermon')} className="w-full p-6 bg-white rounded-[24px] border border-[#E5E0DA]/50 flex items-center gap-4 hover:border-orange-500/30 hover:shadow-lg transition-all group">
                               <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                  <span className="material-symbols-outlined">auto_stories</span>
                               </div>
                               <span className="text-xs font-black uppercase tracking-widest">讲道大纲资源</span>
                            </button>
                         </div>
                      </div>

                      <button 
                        onClick={() => setIsUploading(false)}
                        className="w-full py-5 bg-black text-white rounded-[24px] text-[10px] font-black font-sans uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl active:scale-95"
                      >
                         Cancel Upload
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistence Notification */}
      <AnimatePresence>
        {noti && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] bg-black text-white px-10 py-6 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] flex items-center gap-4"
          >
             <span className="material-symbols-outlined text-emerald-400">offline_pin</span>
             {noti}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
