import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

import { QRCodeSVG } from 'qrcode.react';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'photo' | 'lyric' | 'link' | 'file';
  url: string;
  created_at: string;
  author_name: string;
  author_id: string;
}

export default function Groups() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', type: 'link', url: '' });

  const isZh = language.startsWith('zh');
  const t = (key: string) => {
    const translations: any = {
      title: isZh ? '小组资料共享' : 'Group Resources',
      subtitle: isZh ? '在这里分享照片、诗歌、链接和各类资料' : 'Share photos, lyrics, links and resources here',
      add: isZh ? '分享新资料' : 'Share New Resource',
      post: isZh ? '发布' : 'Post',
      cancel: isZh ? '取消' : 'Cancel',
      formTitle: isZh ? '标题' : 'Title',
      formDesc: isZh ? '描述' : 'Description',
      formUrl: isZh ? '链接/URL' : 'Link / URL',
      type: isZh ? '类型' : 'Type',
      photo: isZh ? '照片' : 'Photo',
      lyric: isZh ? '诗歌' : 'Lyric',
      link: isZh ? '链接' : 'Link',
      file: isZh ? '文件' : 'File',
      empty: isZh ? '暂无分享资料' : 'No resources shared yet',
    };
    return translations[key] || key;
  };

  const fetchResources = async () => {
    const targetChurchId = profile?.church_id;
    
    if (!targetChurchId) {
      // If we don't have a church ID, we only stop loading if the profile is actually loaded
      if (profile) setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('group_resources')
        .select('*')
        .eq('church_id', targetChurchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Resources fetch error', error);
      } else {
        setResources(data || []);
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
    
    // Safety exit for loading state
    const timer = setTimeout(() => {
       setIsLoading(false);
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [profile?.church_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.church_id) return;

    try {
      const { data, error } = await supabase
        .from('group_resources')
        .insert({
          ...formData,
          church_id: profile.church_id,
          author_id: user.id,
          author_name: profile.full_name || 'Anonymous'
        })
        .select()
        .single();

      if (error) {
         if (error.code === 'PGRST116' || error.message.includes('relation "group_resources" does not exist')) {
            alert(isZh ? '系统正在升级数据库，请稍后再试。' : 'Database is being updated, please try again later.');
            return;
         }
         throw error;
      }

      setResources([data, ...resources]);
      setIsAdding(false);
      setFormData({ title: '', description: '', type: 'link', url: '' });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-black text-on-surface tracking-tight">{t('title')}</h1>
          <p className="text-outline mt-1 font-medium">{t('subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary text-white font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add_circle</span>
          {t('add')}
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white border border-outline-variant/20 rounded-[32px] p-8 shadow-2xl shadow-black/[0.05] space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('formTitle')}</label>
                    <input 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-surface-container rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('type')}</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                      className="w-full bg-surface-container rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                    >
                      <option value="link">{t('link')}</option>
                      <option value="photo">{t('photo')}</option>
                      <option value="lyric">{t('lyric')}</option>
                      <option value="file">{t('file')}</option>
                    </select>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('formUrl')}</label>
                  <input 
                    required
                    value={formData.url}
                    onChange={e => setFormData({...formData, url: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-surface-container rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('formDesc')}</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-surface-container rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all h-24"
                  />
               </div>

               <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-primary text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg hover:bg-primary/90 transition-all">
                    {t('post')}
                  </button>
                  <button type="button" onClick={() => setIsAdding(false)} className="px-10 bg-surface-container text-outline font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-error/10 hover:text-error transition-all">
                    {t('cancel')}
                  </button>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-surface-container-low rounded-[40px] p-20 text-center border border-dashed border-outline-variant/30">
          <span className="material-symbols-outlined text-6xl text-outline/20 mb-4 scale-125">share</span>
          <h3 className="text-xl font-bold text-outline/40">{t('empty')}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <ResourceCard key={res.id} resource={res} isZh={isZh} onShowQR={() => setShowQR(res.url)} />
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQR(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-10 rounded-[48px] shadow-2xl relative z-10 flex flex-col items-center gap-6 max-w-sm w-full"
            >
              <div className="p-4 bg-surface-container rounded-[32px]">
                <QRCodeSVG value={showQR} size={200} />
              </div>
              <div className="text-center">
                <p className="text-on-surface font-bold text-lg mb-1">{isZh ? '扫描二维码' : 'Scan QR Code'}</p>
                <p className="text-outline text-xs break-all px-4">{showQR}</p>
              </div>
              <button 
                onClick={() => setShowQR(null)}
                className="w-full bg-black text-white font-black uppercase tracking-widest py-4 rounded-2xl"
              >
                {isZh ? '关闭' : 'Close'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResourceCard({ resource, isZh, onShowQR }: { resource: Resource; isZh: boolean; onShowQR: () => void }) {
  const getIcon = () => {
    switch (resource.type) {
      case 'photo': return 'image';
      case 'lyric': return 'music_note';
      case 'file': return 'description';
      default: return 'link';
    }
  };

  const getColor = () => {
    switch (resource.type) {
      case 'photo': return 'primary';
      case 'lyric': return 'secondary';
      case 'file': return 'tertiary';
      default: return 'primary';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[32px] p-6 border border-outline-variant/10 shadow-xl shadow-black/[0.03] hover:shadow-2xl transition-all flex flex-col group relative"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl bg-${getColor()}/10 flex items-center justify-center text-${getColor()} shadow-inner`}>
            <span className="material-symbols-outlined">{getIcon()}</span>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-on-surface truncate leading-tight group-hover:text-primary transition-colors">{resource.title}</h4>
            <p className="text-[10px] text-outline font-black uppercase tracking-widest">{resource.type}</p>
          </div>
        </div>
        <button 
          onClick={onShowQR}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-container text-outline hover:bg-black hover:text-white transition-all shadow-sm"
          title="Show QR Code"
        >
          <span className="material-symbols-outlined text-xl">qr_code_2</span>
        </button>
      </div>

      <p className="text-sm text-on-surface-variant line-clamp-3 mb-6 flex-1 opacity-70">
        {resource.description || (isZh ? '点击查看详细资料内容...' : 'Click to view more details...')}
      </p>

      <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-black text-outline">
            {resource.author_name.charAt(0)}
          </div>
          <span className="text-[10px] font-bold text-outline uppercase">{resource.author_name}</span>
        </div>
        <a 
          href={resource.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-10 w-10 rounded-full bg-surface-container flex items-center justify-center text-outline hover:bg-primary hover:text-white transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">open_in_new</span>
        </a>
      </div>
    </motion.div>
  );
}
