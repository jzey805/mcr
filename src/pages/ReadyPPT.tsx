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
  const [previewItem, setPreviewItem] = useState<PPTItem | null>(null);

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredLibrary.length > 0 ? (
            filteredLibrary.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => setPreviewItem(item)}
                className="group relative bg-white rounded-2xl border border-[#E5E0DA]/30 p-4 hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 flex flex-col cursor-pointer aspect-[4/5]"
              >
                 <div className="flex justify-between items-start mb-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-500 ${item.type === 'weekly' ? 'bg-emerald-500 text-white' : item.type === 'song' ? 'bg-indigo-600 text-white' : 'bg-orange-500 text-white'}`}>
                      <span className="material-symbols-outlined text-base">
                         {item.type === 'weekly' ? 'auto_awesome_motion' : item.type === 'song' ? 'mic_external_on' : 'edit_document'}
                      </span>
                    </div>
                    <span className="text-[6px] font-black text-outline/30 uppercase tracking-tighter">{item.size}</span>
                 </div>

                 <div className="flex-1 flex flex-col justify-between">
                    <div className="mb-2">
                       <h4 className="text-[11px] font-serif font-black text-[#2C2C2C] leading-snug line-clamp-3">
                         {item.name}
                       </h4>
                    </div>
  
                    <div className="pt-2.5 border-t border-[#E5E0DA]/30 flex justify-between items-center">
                        <p className="text-[7px] font-bold text-outline/40">{item.date}</p>
                        <span className="material-symbols-outlined text-emerald-500/30 text-[12px]">view_quilt</span>
                    </div>
                 </div>

                 {/* Hover Action Overlay */}
                 <div className="absolute inset-x-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0" onClick={e => e.stopPropagation()}>
                    <button 
                       onClick={() => handleDownload(item)}
                       className="w-full py-1 bg-black text-white rounded-md text-[6px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
                    >
                      Download
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
               className="relative bg-[#F9F7F5] w-full max-w-4xl rounded-[48px] overflow-hidden shadow-2xl p-8 lg:p-16"
             >
                <div className="flex flex-col lg:flex-row gap-12">
                   <div className="flex-1 space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-3xl font-serif font-black text-[#2C2C2C] tracking-tighter italic">Upload Resource</h2>
                        <p className="text-[11px] text-outline/40 font-medium whitespace-pre-wrap">请将您的 PPT 文件拖入下方或点击选择分类进行录入。</p>
                      </div>

                      <div className="border-2 border-dashed border-[#E5E0DA] rounded-[32px] aspect-video flex flex-col items-center justify-center group hover:border-emerald-500/30 hover:bg-emerald-50/30 transition-all cursor-pointer">
                         <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-outline/20 shadow-sm group-hover:text-emerald-500 group-hover:scale-110 transition-all mb-4">
                            <span className="material-symbols-outlined text-3xl">upload_file</span>
                         </div>
                         <p className="text-[9px] font-black uppercase tracking-[0.2em] text-outline/40 group-hover:text-emerald-600">Drag & Drop Files Here</p>
                      </div>
                   </div>

                   <div className="w-px bg-[#E5E0DA] hidden lg:block"></div>

                   <div className="w-full lg:w-72 space-y-8">
                      <div className="space-y-3">
                         <h4 className="text-[9px] font-black uppercase tracking-widest text-[#2C2C2C]">选择资源分类</h4>
                         <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => handleManualUpload('weekly')} className="w-full p-4 bg-white rounded-2xl border border-[#E5E0DA]/50 flex items-center gap-3 hover:border-emerald-500/30 hover:shadow-md transition-all group">
                               <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                  <span className="material-symbols-outlined text-xl">event_repeat</span>
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-widest">本周 PPT</span>
                            </button>
                            <button onClick={() => handleManualUpload('song')} className="w-full p-4 bg-white rounded-2xl border border-[#E5E0DA]/50 flex items-center gap-3 hover:border-indigo-500/30 hover:shadow-md transition-all group">
                               <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  <span className="material-symbols-outlined text-xl">music_note</span>
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-widest">歌库 PPT</span>
                            </button>
                            <button onClick={() => handleManualUpload('sermon')} className="w-full p-4 bg-white rounded-2xl border border-[#E5E0DA]/50 flex items-center gap-3 hover:border-orange-500/30 hover:shadow-md transition-all group">
                               <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                  <span className="material-symbols-outlined text-xl">auto_stories</span>
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-widest">讲道资源</span>
                            </button>
                         </div>
                      </div>

                      <button 
                        onClick={() => setIsUploading(false)}
                        className="w-full py-4 bg-black text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-xl active:scale-95"
                      >
                         Cancel
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Online Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setPreviewItem(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="relative w-full max-w-6xl aspect-video bg-[#1A1A1A] rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
             >
                {/* Simulated PPT Content */}
                <div className="flex-1 flex items-center justify-center relative group">
                   <div className="absolute top-8 left-8 z-10 space-y-1">
                      <h3 className="text-white text-xl font-serif font-black">{previewItem.name}</h3>
                      <p className="text-white/40 text-[10px] font-black tracking-widest uppercase">{previewItem.date} · SLIDE 1 OF 12</p>
                   </div>
                   
                   {/* Placeholder Slide Visual */}
                   <div className="w-full h-full flex flex-col items-center justify-center p-20 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-black pointer-events-none"></div>
                      <span className="material-symbols-outlined text-emerald-500/20 text-[300px] absolute -right-20 -bottom-20 rotate-12 select-none">
                         {previewItem.type === 'weekly' ? 'auto_awesome_motion' : previewItem.type === 'song' ? 'lyrics' : 'menu_book'}
                      </span>
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 space-y-6"
                      >
                        <h2 className="text-6xl md:text-8xl font-serif font-black text-white italic leading-tight tracking-tighter">
                          {previewItem.title || previewItem.name.split('_').join(' ')}
                        </h2>
                        {previewItem.preacher && (
                          <p className="text-emerald-400 text-2xl font-black uppercase tracking-[0.5em]">{previewItem.preacher}</p>
                        )}
                        <p className="text-white/60 text-lg max-w-2xl mx-auto font-medium">
                          "Everything you design should have a rhythm, a purpose, and a soul."
                        </p>
                      </motion.div>
                   </div>

                   {/* Controls */}
                   <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="h-10 w-10 rounded-xl hover:bg-white/10 text-white transition-colors">
                        <span className="material-symbols-outlined">navigate_before</span>
                      </button>
                      <div className="h-10 px-4 flex items-center text-[10px] font-black text-white/60 border-x border-white/10 uppercase tracking-widest">
                        1 / 12
                      </div>
                      <button className="h-10 w-10 rounded-xl hover:bg-white/10 text-white transition-colors">
                        <span className="material-symbols-outlined">navigate_next</span>
                      </button>
                   </div>
                </div>

                {/* Footer bar */}
                <div className="h-20 bg-white/5 border-t border-white/10 flex items-center justify-between px-10 shrink-0">
                   <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${previewItem.type === 'weekly' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                      <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">{previewItem.type} Mode</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleDownload(previewItem)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                         <span className="material-symbols-outlined text-sm">download</span>
                         Download PPT
                      </button>
                      <button 
                        onClick={() => setPreviewItem(null)}
                        className="px-6 py-3 bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                      >
                         Close
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
