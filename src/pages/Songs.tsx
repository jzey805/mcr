import React, { useState, useEffect } from 'react';
import { useMode } from '../contexts/ModeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { fetchSongFromUrl } from '../services/geminiService';

import pptxgen from "pptxgenjs";

const INITIAL_LIBRARY = [
  { 
    id: '1', 
    title: '奇异恩典', 
    englishTitle: 'Amazing Grace', 
    pages: 8, 
    lyrics: '奇异恩典 何等甘甜\n我罪已得赦免\n前我失丧 今被寻回\n瞎眼今得看见',
    englishLyrics: 'Amazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see',
    key: 'Bb' 
  },
  { 
    id: '2', 
    title: '祢是我我的力量', 
    englishTitle: 'You Are My Strength', 
    pages: 10, 
    lyrics: '祢是我力量 当我很软弱\n祢是我心中 无价珍宝\n祢是我所有一切\n寻得祢真珠 我不愿放弃',
    englishLyrics: 'You are my strength when I am weak\nYou are the treasure that I seek\nYou are my all in all\nSeeking You as a precious jewel',
    key: 'G' 
  },
  { id: '3', title: '哈利路亚', englishTitle: 'Hallelujah', pages: 6, lyrics: '我听过那神秘的和弦\n大卫弹奏取悦上主', englishLyrics: 'I heard there was a secret chord\nThat David played and it pleased the Lord', key: 'D' },
  { id: '4', title: '在这里', englishTitle: 'Right Here', pages: 5, lyrics: '在这里 我遇见祢\n在这里 我降服于祢', englishLyrics: 'Right here I meet You\nRight here I surrender to You', key: 'C' },
];

export default function Songs() {
  const { mode } = useMode();
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState<'Library' | 'Weekly' | 'Export' | 'Ready'>('Library');
  const [librarySongs, setLibrarySongs] = useState(INITIAL_LIBRARY);
  const [weeklySetlist, setWeeklySetlist] = useState<any[]>(INITIAL_LIBRARY.slice(0, 3));
  
  // Ready PPT Library State
  const [pptLibrary, setPptLibrary] = useState<any[]>([
    { id: 'p1', name: 'Ready_PPT_Sunday_Worship_2024-05-01', type: 'weekly', date: '2024-05-01', songCount: 4, size: '4.2MB' },
    { id: 'p2', name: 'Amazing_Grace_Standard', type: 'song', date: '2024-04-28', title: '奇异恩典', size: '1.1MB' },
    { id: 'p3', name: 'Sermon_Living_By_Faith', type: 'sermon', date: '2024-05-01', preacher: 'Ps. David', size: '2.8MB' }
  ]);
  const [readyFilter, setReadyFilter] = useState<'all' | 'song' | 'weekly' | 'sermon'>('all');
  const [isAddingSong, setIsAddingSong] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState('');
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [newSongData, setNewSongData] = useState({ 
    title: '', 
    englishTitle: '', 
    lyrics: '', 
    englishLyrics: '',
    external_url: '' 
  });
  const [editingSong, setEditingSong] = useState<any | null>(null);
  const [previewingSong, setPreviewingSong] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  
  // Background selection state
  const BACKGROUND_OPTIONS = [
    { id: 'emerald', label: t('bgEmerald') || '森林深绿', color: '064E3B', url: null },
    { id: 'light', label: t('bgLight') || '圣洁光芒', url: 'https://images.unsplash.com/photo-1510531704581-5b2870972060?auto=format&fit=crop&q=80&w=1280' },
    { id: 'peace', label: t('bgPeace') || '宁静时刻', url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1280' },
    { id: 'cross', label: t('bgCross') || '福音之光', url: 'https://images.unsplash.com/photo-1445053023192-8d45cb66099d?auto=format&fit=crop&q=80&w=1280' },
    { id: 'mountain', label: t('bgMountain') || '群山呼唤', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1280' },
    { id: 'ocean', label: t('bgOcean') || '圣灵如水', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&q=80&w=1280' },
    { id: 'stars', label: t('bgStars') || '星空穹苍', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4b519?auto=format&fit=crop&q=80&w=1280' },
    { id: 'ai', label: t('aiGenerate') || 'AI 生成', isAi: true }
  ];
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_OPTIONS[0]);
  const [isGeneratingAiBg, setIsGeneratingAiBg] = useState(false);
  const [linesPerSlide, setLinesPerSlide] = useState(2); 
  const [pptVersionName, setPptVersionName] = useState('Sunday Worship');
  const [pdfVersionName, setPdfVersionName] = useState('SETLIST_HANDOUT');
  const [isEditingPptName, setIsEditingPptName] = useState(false);
  const [isEditingPdfName, setIsEditingPdfName] = useState(false);
  const [customBgs, setCustomBgs] = useState<any[]>([]);

  const handleAiBgGen = () => {
    setIsGeneratingAiBg(true);
    
    // Expanded pool for high-quality worship/nature Unsplash IDs
    const aiImageIds = [
      '1510531704581-5b2870972060', '1438232992991-995b7058bbb3', '1445053023192-8d45cb66099d',
      '1464822759023-fed622ff2c3b', '1518837695005-2083093ee35b', '1506318137071-a8e063b4b519',
      '1519834125788-df31765c8f74', '1516062423079-7ca13cdc7f5a', '1491333078588-55b6733c79c0',
      '1493612276216-ee3925520721', '1475924156735-5023f2771741', '1470071459604-3b5ec3a7fe05',
      '1501785888041-af3ef285b470', '1506744038136-46273834b3fb', '1518495973542-4542c06a5843'
    ];
    
    const randomId = aiImageIds[Math.floor(Math.random() * aiImageIds.length)];
    const seed = Math.random().toString(36).substring(7);
    const aiUrl = `https://images.unsplash.com/photo-${randomId}?auto=format&fit=crop&q=80&w=1280&sig=${seed}`;
    
    // Simulate generation delay
    setTimeout(() => {
      setIsGeneratingAiBg(false);
      const newAiBg = { 
        id: `ai-${Date.now()}`, 
        label: t('aiBgGenerated'), 
        url: aiUrl,
        isAiResult: true,
        isLoading: true 
      };
      setCustomBgs(prev => [...prev, newAiBg]);
      setSelectedBg(newAiBg);
      setDownloadStatus(`✨ ${t('aiBgGenerated')}`);
      setTimeout(() => setDownloadStatus(null), 2000);
    }, 2000);
  };
  
  const allBgOptions = [...BACKGROUND_OPTIONS, ...customBgs];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newBg = {
          id: `custom-${customBgs.length}-${Date.now()}`,
          label: t('uploadImage'),
          url: dataUrl
        };
        setCustomBgs([...customBgs, newBg]);
        setSelectedBg(newBg);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Translation state for modal
  const [tempLyrics, setTempLyrics] = useState('');
  const [tempTranslation, setTempTranslation] = useState('');

  useEffect(() => {
    if (editingSong) {
      setTempLyrics(editingSong.lyrics || '');
      setTempTranslation(editingSong.englishLyrics || t('translatingViaAi'));
      
      // Mock AI Translation trigger
      const timer = setTimeout(() => {
        if (!editingSong.englishLyrics || editingSong.englishLyrics === t('translatingViaAi')) {
          // If it's one of our samples, use real lines, otherwise mock it
          if (editingSong.title === '奇异恩典') {
            setTempTranslation('Amazing grace how sweet the sound\nThat saved a wretch like me');
          } else if (editingSong.title === '祢是我我的力量') {
            setTempTranslation('You are my strength when I am weak\nYou are the treasure that I seek');
          } else {
            setTempTranslation(tempLyrics.split('\n').map(l => `[AI Translation of: ${l}]`).join('\n'));
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [editingSong]);
  
  // Stats
  const totalPages = weeklySetlist.reduce((acc, song) => acc + song.pages, 0);

  const handleGeneratePpt = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setActiveStep('Export');
    }, 2000);
  };

  const handleUpdateSong = (updatedSong: any) => {
    const newLibrary = librarySongs.map(s => s.id === updatedSong.id ? updatedSong : s);
    setLibrarySongs(newLibrary);
    
    // Also update in weekly setlist if present
    setWeeklySetlist(weeklySetlist.map(s => s.id === updatedSong.id ? { ...s, ...updatedSong } : s));
    
    setEditingSong(null);
    setDownloadStatus(t('successfullySaved'));
    setTimeout(() => setDownloadStatus(null), 3000);
  };

  const handleFetchLyrics = async () => {
    if (!newSongUrl) return;
    setIsFetchingLyrics(true);
    try {
      const data = await fetchSongFromUrl(newSongUrl);
      setNewSongData({
        ...newSongData,
        title: data.title || '',
        englishTitle: data.englishTitle || '',
        lyrics: data.lyrics || '',
        englishLyrics: data.englishLyrics || '',
        external_url: newSongUrl
      });
      setDownloadStatus(t('previewReady'));
    } catch (error) {
      setDownloadStatus(t('invalidUrl'));
    } finally {
      setIsFetchingLyrics(false);
      setTimeout(() => setDownloadStatus(null), 3000);
    }
  };

  const handleSaveNewSong = () => {
    const newSong = {
      ...newSongData,
      id: String(Date.now()),
      pages: Math.ceil((newSongData.lyrics.split('\n').length || 1) / linesPerSlide) + 1
    };
    setLibrarySongs([newSong, ...librarySongs]);
    setIsAddingSong(false);
    setNewSongData({ title: '', englishTitle: '', lyrics: '', englishLyrics: '', external_url: '' });
    setNewSongUrl('');
    setDownloadStatus(t('successfullySaved'));
    setTimeout(() => setDownloadStatus(null), 3000);
  };

  const handleDownload = (fileName: string) => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    // Choose actual filename based on context or user input
    let targetFileName = fileName;
    if (fileName.includes('Ready_PPT') || fileName.includes('Worship_Setlist')) {
      targetFileName = `Ready_PPT_${pptVersionName}_${dateStr}.pptx`;
    }

    setDownloadStatus(`${t('generating')} ${targetFileName}...`);
    
    let pres = new pptxgen();
    
    const generateSongSlides = (song: any) => {
      const activeBg = song.customBg || selectedBg;
      
      const setSlideBg = (s: any) => {
        if (activeBg.url) {
          // If it's a data URL, pptxgenjs handles it better via path if properly formatted
          s.background = { path: activeBg.url };
        } else {
          s.background = { color: activeBg.color || "064E3B" };
        }
      };

      // Cover slide
      let slide = pres.addSlide();
      setSlideBg(slide);

      slide.addText(song.title, { 
        x: 0, y: 1.5, w: "100%", h: 2, 
        align: "center", fontFace: "Georgia", fontSize: 48, color: "FFFFFF", bold: true 
      });
      
      slide.addText(song.englishTitle || "", { 
        x: 0, y: 3.5, w: "100%", h: 1, 
        align: "center", fontFace: "Arial", fontSize: 24, color: "A7F3D0" 
      });
      
      const lyricsLines = (song.lyrics || "").split('\n').filter((l: string) => l.trim().length > 0);
      const englishLines = (song.englishLyrics || "").split('\n').filter((l: string) => l.trim().length > 0);
      
      const pairsPerSlide = Math.max(1, linesPerSlide); 

      for(let i=0; i<lyricsLines.length; i += pairsPerSlide) {
         let lSlide = pres.addSlide();
         setSlideBg(lSlide);
         
         let currentY = 1.0;

         for (let j = 0; j < pairsPerSlide; j++) {
            const idx = i + j;
            if (lyricsLines[idx]) {
               lSlide.addText(lyricsLines[idx], {
                  x: 0, y: currentY, w: "100%", h: 0.8,
                  align: "center", fontFace: "Georgia", fontSize: 32, color: "FFFFFF", bold: true
               });
               currentY += 0.7;

               if (englishLines[idx]) {
                  lSlide.addText(englishLines[idx], {
                     x: 0, y: currentY, w: "100%", h: 0.6,
                     align: "center", fontFace: "Arial", fontSize: 20, color: "A7F3D0", italic: true
                  });
                  currentY += 0.8;
               }
            }
         }
      }
    };

    if (fileName.endsWith('.pdf')) {
      setDownloadStatus(`${t('generating')} ${fileName}...`);
      setTimeout(() => {
        const element = document.createElement('a');
        const file = new Blob(['Simulated PDF Content'], {type: 'application/pdf'});
        element.href = URL.createObjectURL(file);
        element.download = fileName;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        
        setDownloadStatus(`${t('downloaded')}: ${fileName}`);
        setTimeout(() => setDownloadStatus(null), 3000);
      }, 1000);
      return;
    }

    if (fileName.includes('Worship_Setlist') || fileName.includes('Ready_PPT') || fileName === `${pptVersionName}.pptx`) {
      weeklySetlist.forEach(song => generateSongSlides(song));
    } else if (previewingSong && fileName === `${previewingSong.title}.pptx`) {
      generateSongSlides(previewingSong);
    } 

    pres.writeFile({ fileName: targetFileName }).then(() => {
        setDownloadStatus(`${t('successfullySaved')}: ${targetFileName}`);
        setTimeout(() => setDownloadStatus(null), 3000);
    }).catch((err) => {
        console.error(err);
        setDownloadStatus(t('generationFailed'));
        setTimeout(() => setDownloadStatus(null), 3000);
    });
  };

  const handlePreview = (fileName: string) => {
    setDownloadStatus(`${t('renderingPreview')}: ${fileName}...`);
    setTimeout(() => {
      setDownloadStatus(t('previewReady'));
      setTimeout(() => setDownloadStatus(null), 3000);
      // In a real app, this would open a viewer
      window.open('https://docs.google.com/presentation/d/e/2PACX-1vT5n8...', '_blank');
    }, 1000);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#F9F7F5] overflow-y-auto no-scrollbar pb-24">
      {/* Workflow Strategy Header */}
      <div className="p-8 md:p-12 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4 md:gap-8 mb-12">
          {/* Step 1: Library */}
          <button 
            onClick={() => setActiveStep('Library')}
            className={`flex-1 min-h-[140px] rounded-[24px] p-6 text-center border-2 transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${activeStep === 'Library' ? 'bg-[#EEEDFF] border-[#4F46E5]/30 shadow-lg shadow-purple-500/5' : 'bg-white border-transparent grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
          >
            <span className="text-xl font-serif font-black text-[#4F46E5]">{t('songLibrary')}</span>
            <div className="text-[10px] font-bold text-[#4F46E5]/60 uppercase tracking-widest leading-relaxed">
              {t('pasteLyricsDesc')}<br />
              {t('dualLanguageDesc')}<br />
              {t('saveDirectlyDesc')}
            </div>
            {activeStep === 'Library' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#4F46E5]"></div>}
          </button>

          <span className="material-symbols-outlined text-outline/30 scale-150 shrink-0">arrow_forward</span>

          {/* Step 2: Setlist */}
          <button 
            onClick={() => setActiveStep('Weekly')}
            className={`flex-1 min-h-[140px] rounded-[24px] p-6 text-center border-2 transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${activeStep === 'Weekly' ? 'bg-[#E3F9F1] border-[#10B981]/30 shadow-lg shadow-emerald-500/5' : 'bg-white border-transparent grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
          >
            <span className="text-xl font-serif font-black text-[#10B981]">{t('weeklySetlist')}</span>
            <div className="text-[10px] font-bold text-[#10B981]/60 uppercase tracking-widest leading-relaxed">
              {t('selectFromLibDesc')}<br />
              {t('dragToReorderDesc')}<br />
              {t('configBgDesc')}
            </div>
            {activeStep === 'Weekly' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#10B981]"></div>}
          </button>

          <span className="material-symbols-outlined text-outline/30 scale-150 shrink-0">arrow_forward</span>

          {/* Step 3: Export */}
          <button 
            onClick={() => setActiveStep('Export')}
            className={`flex-1 min-h-[140px] rounded-[24px] p-6 text-center border-2 transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${activeStep === 'Export' ? 'bg-[#FFF4E5] border-[#F59E0B]/30 shadow-lg shadow-orange-500/5' : 'bg-white border-transparent grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
          >
            <span className="text-xl font-serif font-black text-[#F59E0B]">{t('oneClickExport')}</span>
            <div className="text-[10px] font-bold text-[#F59E0B]/60 uppercase tracking-widest leading-relaxed">
              {t('smartMergeDesc')}<br />
              {t('pkgPublishDesc')}<br />
              {t('notifyItDesc')}
            </div>
            {activeStep === 'Export' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#F59E0B]"></div>}
          </button>

          <span className="material-symbols-outlined text-outline/30 scale-150 shrink-0">arrow_forward</span>

          {/* New Step: Ready PPT */}
          <button 
            onClick={() => setActiveStep('Ready')}
            className={`flex-1 min-h-[140px] rounded-[24px] p-6 text-center border-2 transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${activeStep === 'Ready' ? 'bg-emerald-50 border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'bg-white border-transparent grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
          >
            <span className="text-xl font-serif font-black text-emerald-600">{t('readyPptLib')}</span>
            <div className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest leading-relaxed">
              {t('cloudStorageDesc')}<br />
              {t('categorizedDesc')}<br />
              {t('distPreviewDesc')}
            </div>
            {activeStep === 'Ready' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600"></div>}
          </button>
        </div>

        {/* Dynamic Content Area */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 flex items-center justify-center gap-3">
             <div className="h-px w-12 bg-[#E5E0DA]"></div>
              <h2 className="text-xl font-serif font-black text-[#2C2C2C] uppercase tracking-widest">
                {activeStep === 'Library' ? t('firstStepLib') : activeStep === 'Weekly' ? t('secondStepSetlist') : activeStep === 'Ready' ? t('readyPptStation') : t('finalStepExport')}
              </h2>
              <div className="h-px w-12 bg-[#E5E0DA]"></div>
            </div>

            <AnimatePresence mode="wait">
              {activeStep === 'Weekly' && (
              <motion.div 
                key="weekly"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
              >
                {/* Weekly Settings Bar */}
                <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-8 rounded-[32px] border border-[#E5E0DA]/50 shadow-sm">
                   <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('pptFileName')}</span>
                       <span className="material-symbols-outlined text-[14px] text-emerald-500">drive_file_rename_outline</span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#F9F7F5] rounded-2xl px-6 py-4 border border-emerald-500/10 shadow-inner group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                       <input 
                         type="text"
                         value={pptVersionName}
                         onChange={(e) => setPptVersionName(e.target.value)}
                         className="bg-transparent border-none text-lg font-serif font-black text-[#2C2C2C] focus:ring-0 w-full p-0"
                         placeholder="e.g. Sunday Worship 2024-05-01"
                       />
                    </div>
                  </div>
                  <div className="h-12 w-px bg-[#E5E0DA] hidden md:block"></div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <span className="text-[10px] font-black text-outline/40 uppercase tracking-widest">{t('globalLayout')}</span>
                    <div className="flex gap-1 p-1 bg-[#F9F7F5] rounded-xl border border-[#E5E0DA]/30">
                      {[1, 2, 3].map((val) => (
                        <button 
                          key={val}
                          onClick={() => setLinesPerSlide(val)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${linesPerSlide === val ? 'bg-white text-emerald-600 shadow-sm' : 'text-outline/40'}`}
                        >
                          {val} {t('pairsPerSlide')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Setlist List */}
                <Reorder.Group axis="y" values={weeklySetlist} onReorder={setWeeklySetlist} className="space-y-4">
                  {weeklySetlist.length > 0 ? (
                    weeklySetlist.map((song, index) => (
                      <Reorder.Item 
                        key={song.id} 
                        value={song}
                        className="bg-white rounded-[20px] p-6 border border-[#E5E0DA]/50 shadow-sm flex items-center gap-6 cursor-grab active:cursor-grabbing hover:border-emerald-500/20 group/item"
                      >
                        <div className="w-10 h-10 flex items-center justify-center text-lg font-serif font-black text-outline/40">
                          {index + 1}
                        </div>
                        <div 
                          className="flex-1 cursor-zoom-in"
                          onClick={() => setPreviewingSong(song)}
                        >
                          <h3 className="text-[18px] font-serif font-black text-[#2C2C2C] group-hover/item:text-emerald-600 transition-colors">{song.title}</h3>
                          <div className="flex items-center gap-4 mt-1">
                             <p className="text-[10px] font-bold text-outline/60 uppercase tracking-wide">
                               {song.englishTitle} · {song.pages} {t('pageCountStr')} · <span className="text-emerald-500/60 font-black italic">{t('preview')}</span>
                             </p>
                             
                             <div className="flex items-center gap-2 border-l border-[#E5E0DA] pl-4">
                                <span className="text-[8px] font-black text-outline/30 uppercase tracking-tighter">{t('independentBg')}:</span>
                                <div className="flex gap-1">
                                   {allBgOptions.slice(0, 5).map(bg => (
                                      <button 
                                        key={bg.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setWeeklySetlist(weeklySetlist.map(s => s.id === song.id ? { ...s, customBg: bg } : s));
                                        }}
                                        className={`w-4 h-4 rounded-full border border-white shadow-sm transition-all hover:scale-125 ${ (song.customBg?.id || selectedBg.id) === bg.id ? 'ring-1 ring-emerald-500 scale-110' : '' }`}
                                        style={bg.url ? { backgroundImage: `url(${bg.url})`, backgroundSize: 'cover' } : { backgroundColor: `#${bg.color}` }}
                                        title={bg.label}
                                      />
                                   ))}
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); setWeeklySetlist(weeklySetlist.map(s => s.id === song.id ? { ...s, customBg: null } : s)); }}
                                      className="w-4 h-4 rounded-full bg-[#F9F7F5] border border-[#E5E0DA] flex items-center justify-center hover:bg-white active:scale-90"
                                      title={t('followTheme')}
                                   >
                                      <span className="material-symbols-outlined text-[10px] text-outline/40">auto_fix_normal</span>
                                   </button>
                                </div>
                             </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-outline/40 group-hover/item:text-emerald-500/60 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
                          {t('dragSort')}
                        </div>
                      </Reorder.Item>
                    ))
                  ) : (
                    <div className="py-20 text-center border-2 border-dashed border-[#E5E0DA] rounded-[32px] bg-white/50">
                        <span className="material-symbols-outlined text-4xl text-outline/20 mb-2">library_music</span>
                        <p className="text-sm font-bold text-outline/40 tracking-wider uppercase">{t('emptySetlistDesc')}</p>
                    </div>
                  )}
                </Reorder.Group>

                {/* Footer Actions */}
                <div className="mt-12 flex items-center justify-between border-t border-[#E5E0DA] pt-8">
                  <button 
                    onClick={() => setActiveStep('Library')}
                    className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/40 hover:text-emerald-600 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    {t('backToLibrary')}
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-bold text-[#2C2C2C] uppercase tracking-widest bg-white ring-1 ring-[#E5E0DA] px-6 py-3 rounded-full">
                      {t('totalCountPages') ? t('totalCountPages').replace('{count}', String(totalPages)) : `Total ${totalPages} Pages`}
                    </div>
                    <button 
                      onClick={handleGeneratePpt}
                      disabled={isGenerating || weeklySetlist.length === 0}
                      className="flex items-center gap-3 bg-[#10B981] text-white px-10 py-5 rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-[#059669] transition-all shadow-xl shadow-emerald-500/20 group disabled:opacity-30 disabled:grayscale"
                    >
                      {isGenerating ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">progress_activity</span>
                          {t('generating') || '拼命生成中...'}
                        </>
                      ) : (
                        <>
                          {t('generatePpt') || '开始生成 PPT'}
                          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 'Library' && (
              <motion.div 
                key="library"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[32px] border border-outline-variant/30 shadow-sm p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div className="relative flex-1 mr-4">
                      <span className="material-symbols-outlined absolute left-4 top-3 text-outline/30">search</span>
                      <input 
                        type="text" 
                        placeholder={t('searchLibraryPlaceholder')} 
                        className="w-full bg-[#F9F7F5] border-none rounded-xl py-3 pl-12 pr-4 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddingSong(true)}
                      className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-purple-600 transition-all shadow-lg shadow-black/10"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      {t('addNewSong')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {librarySongs.map((song) => (
                      <div key={song.id} className="p-5 rounded-2xl border border-[#E5E0DA]/30 hover:border-purple-500/30 bg-white shadow-sm flex items-center justify-between group transition-all">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => setEditingSong(song)}
                        >
                          <div className="flex items-center gap-2">
                             <h4 className="font-serif font-black text-[#2C2C2C]">{song.title}</h4>
                             <span className="material-symbols-outlined text-[14px] text-outline/30 opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                          </div>
                          <p className="text-[10px] font-bold text-outline/50 uppercase tracking-widest">{song.englishTitle}</p>
                        </div>
                        <div className="ml-4 flex gap-2">
                          <button 
                            className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all shadow-sm ${weeklySetlist.find(s => s.id === song.id) ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                            onClick={() => {
                              if (!weeklySetlist.find(s => s.id === song.id)) {
                                setWeeklySetlist([...weeklySetlist, song]);
                              } else {
                                setWeeklySetlist(weeklySetlist.filter(s => s.id !== song.id));
                              }
                            }}
                          >
                            <span className="material-symbols-outlined text-[20px]">{weeklySetlist.find(s => s.id === song.id) ? 'check' : 'add_circle'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => setActiveStep('Weekly')}
                    className="flex items-center gap-3 bg-[#4F46E5] text-white px-10 py-5 rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-[#4338CA] transition-all shadow-xl shadow-purple-500/20 group"
                  >
                    {t('toArrangeSetlist')}
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeStep === 'Ready' && (
              <motion.div 
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Ready PPT Filters */}
                <div className="flex gap-4 p-2 bg-white rounded-3xl border border-[#E5E0DA]/50 shadow-sm">
                   {[
                     { id: 'all', label: t('allFiles'), icon: 'folder' },
                     { id: 'weekly', label: t('weeklyWorshipPpt'), icon: 'event_repeat' },
                     { id: 'song', label: t('songSelectionPpt'), icon: 'music_note' },
                     { id: 'sermon', label: t('sermonOutline'), icon: 'book_5' }
                   ].map(tab => (
                     <button 
                       key={tab.id}
                       onClick={() => setReadyFilter(tab.id as any)}
                       className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all ${readyFilter === tab.id ? 'bg-black text-white shadow-xl' : 'text-outline/40 hover:bg-[#F9F7F5]'}`}
                     >
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                     </button>
                   ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {pptLibrary
                     .filter(p => readyFilter === 'all' || p.type === readyFilter)
                     .map(item => (
                        <div key={item.id} className="bg-white rounded-[32px] p-6 border border-[#E5E0DA]/30 hover:border-emerald-500/30 transition-all group relative">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${item.type === 'weekly' ? 'bg-emerald-100 text-emerald-600' : item.type === 'song' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                             <span className="material-symbols-outlined text-2xl">
                                {item.type === 'weekly' ? 'present_to_all' : item.type === 'song' ? 'music_note' : 'auto_stories'}
                             </span>
                           </div>
                           <h4 className="text-sm font-serif font-black text-[#2C2C2C] mb-2 line-clamp-1">{item.name}</h4>
                           <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-outline/40">
                             <span>{item.date}</span>
                             <span>{item.size}</span>
                           </div>
                           
                           <div className="mt-8 flex gap-2">
                             <button className="flex-1 py-3 bg-[#F9F7F5] rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all">{t('previewSlides')}</button>
                             <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all">
                                <span className="material-symbols-outlined text-lg">download</span>
                             </button>
                           </div>

                           <button className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-outline/20 hover:text-red-500">
                             <span className="material-symbols-outlined text-base">delete</span>
                           </button>
                        </div>
                     ))
                   }

                   {/* Add Sermon Placeholder */}
                   {readyFilter === 'sermon' && (
                     <button className="aspect-square rounded-[32px] border-2 border-dashed border-[#E5E0DA] flex flex-col items-center justify-center text-outline/30 hover:border-orange-500/30 hover:bg-orange-50 group transition-all">
                       <span className="material-symbols-outlined text-4xl mb-4 group-hover:scale-110 transition-transform">upload</span>
                       <p className="text-[10px] font-black uppercase tracking-widest">{t('uploadSermonOutline')}</p>
                     </button>
                   )}
                </div>
              </motion.div>
            )}

            {activeStep === 'Export' && (
              <motion.div 
                key="export"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center p-12 bg-white rounded-[40px] border border-[#E5E0DA]/50 shadow-sm text-center"
              >
                <div className="w-24 h-24 rounded-[32px] bg-emerald-500 text-white flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20">
                  <span className="material-symbols-outlined text-5xl animate-bounce">check_circle</span>
                </div>
                <div className="space-y-4 mb-12">
                  <h3 className="text-4xl font-serif font-black text-[#2C2C2C] tracking-tighter italic">{t('generationComplete')}</h3>
                  <p className="text-outline/40 text-sm max-w-sm mx-auto font-medium leading-relaxed">{t('resourcesReadyDesc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
                  {/* PPT Export Card */}
                  <div className="group p-8 rounded-[36px] bg-[#F9F7F5] border border-[#E5E0DA]/30 flex flex-col items-start text-left gap-6 hover:shadow-xl hover:bg-white transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">present_to_all</span>
                    </div>
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-between group/file">
                         <div className="flex-1 mr-4">
                            {isEditingPptName ? (
                               <input 
                                 autoFocus
                                 type="text"
                                 className="w-full bg-white border-2 border-emerald-500/30 rounded-lg px-2 py-1 text-xs font-black text-[#2C2C2C] focus:ring-0"
                                 value={pptVersionName}
                                 onChange={(e) => setPptVersionName(e.target.value)}
                                 onBlur={() => setIsEditingPptName(false)}
                                 onKeyDown={(e) => e.key === 'Enter' && setIsEditingPptName(false)}
                               />
                            ) : (
                               <h4 
                                 onClick={() => setIsEditingPptName(true)}
                                 className="text-sm font-black text-[#2C2C2C] uppercase tracking-wider line-clamp-1 flex items-center gap-2 cursor-pointer group-hover:text-emerald-600"
                               >
                                 {pptVersionName}.PPTX
                                 <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                               </h4>
                            )}
                         </div>
                         <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase">LIVE</span>
                      </div>
                      <p className="text-[10px] font-bold text-outline/40 uppercase tracking-widest leading-relaxed">
                        {t('lyricOptimization')} · {t('perSlide')} {linesPerSlide} {t('pairsPerSlide')} · {t('themeInjected')}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full mt-4">
                       <button 
                         onClick={() => {
                           const today = new Date().toISOString().split('T')[0];
                           const newPpt = { id: `p-${Date.now()}`, name: `${pptVersionName}_${today}`, type: 'weekly', date: today, size: '4.5MB' };
                           setPptLibrary([newPpt, ...pptLibrary]);
                           setDownloadStatus("✅ " + t('saveToReadyLib'));
                           setTimeout(() => setDownloadStatus(null), 2000);
                         }}
                         className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2"
                       >
                         <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                         {t('saveToReadyLib')}
                       </button>
                       <button 
                         onClick={() => handleDownload(`${pptVersionName}.pptx`)}
                         className="w-full py-4 bg-white text-emerald-600 border border-emerald-600/30 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                       >
                         <span className="material-symbols-outlined text-[16px]">download</span>
                         {t('exportPptx')}
                       </button>
                    </div>
                  </div>

                  {/* PDF Export Card */}
                  <div className="group p-8 rounded-[36px] bg-[#F9F7F5] border border-[#E5E0DA]/30 flex flex-col items-start text-left gap-6 hover:shadow-xl hover:bg-white transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                    </div>
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-between">
                         <div className="flex-1 mr-4">
                            {isEditingPdfName ? (
                               <input 
                                 autoFocus
                                 type="text"
                                 className="w-full bg-white border-2 border-black/10 rounded-lg px-2 py-1 text-xs font-black text-[#2C2C2C] focus:ring-0 focus:border-black/30"
                                 value={pdfVersionName}
                                 onChange={(e) => setPdfVersionName(e.target.value)}
                                 onBlur={() => setIsEditingPdfName(false)}
                                 onKeyDown={(e) => e.key === 'Enter' && setIsEditingPdfName(false)}
                               />
                            ) : (
                               <h4 
                                 onClick={() => setIsEditingPdfName(true)}
                                 className="text-sm font-black text-[#2C2C2C] uppercase tracking-wider line-clamp-1 flex items-center gap-2 cursor-pointer group-hover:text-emerald-600"
                               >
                                 {pdfVersionName}.PDF
                                 <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                               </h4>
                            )}
                         </div>
                         <span className="px-2 py-0.5 rounded bg-black/5 text-outline/40 text-[8px] font-black uppercase">DOC</span>
                      </div>
                      <p className="text-[10px] font-bold text-outline/40 uppercase tracking-widest leading-relaxed">
                        {t('summary')} · {t('sermonOutline')} · 2.1 MB · {t('justNow')}
                      </p>
                    </div>
                    <div className="mt-auto w-full pt-4 space-y-3">
                       <button 
                         onClick={() => handlePreview('Setlist_Lyrics.pdf')}
                         className="w-full py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                       >
                         <span className="material-symbols-outlined text-[16px]">visibility</span>
                         {t('previewSetlistDoc')}
                       </button>
                       <button 
                         onClick={() => handleDownload(`${pdfVersionName}.pdf`)}
                         className="w-full py-3 border border-black/10 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                       >
                         <span className="material-symbols-outlined text-[14px]">download</span>
                         {t('exportPdf')}
                       </button>
                    </div>
                  </div>

                  {/* Roster PDF Export Card */}
                  <div className="group p-8 rounded-[36px] bg-[#F9F7F5] border border-[#E5E0DA]/30 flex flex-col items-start text-left gap-6 hover:shadow-xl hover:bg-white transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">table_view</span>
                    </div>
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-between">
                         <div className="flex-1 mr-4">
                               <h4 className="text-sm font-black text-[#2C2C2C] uppercase tracking-wider line-clamp-1 flex items-center gap-2">
                                 ROSTER.PDF
                               </h4>
                         </div>
                         <span className="px-2 py-0.5 rounded bg-[#4F46E5]/10 text-[#4F46E5] text-[8px] font-black uppercase">DOC</span>
                      </div>
                      <p className="text-[10px] font-bold text-outline/40 uppercase tracking-widest leading-relaxed">
                        {t('roster')} · {t('sundayWorship')}
                      </p>
                    </div>
                    <div className="mt-auto w-full pt-4 space-y-3">
                       <a
                         href="/#roster" 
                         className="w-full py-4 bg-[#4F46E5] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#4338CA] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 block text-center"
                       >
                         <span className="material-symbols-outlined text-[16px]">visibility</span>
                         {t('viewAll')}
                       </a>
                       <button 
                         onClick={() => handleDownload(`Roster_${Date.now()}.pdf`)}
                         className="w-full py-3 border border-black/10 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                       >
                         <span className="material-symbols-outlined text-[14px]">download</span>
                         {t('exportRosterPdf')}
                       </button>
                    </div>
                  </div>
                </div>

                <div className="mt-16 flex flex-col items-center gap-4">
                  <button 
                    onClick={() => setActiveStep('Library')}
                    className="text-[10px] font-black text-outline/40 uppercase tracking-[0.2em] hover:text-emerald-600 transition-colors"
                  >
                    ← {t('backToSetlist')}
                  </button>
                  {downloadStatus && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-6 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest"
                    >
                      {downloadStatus}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {downloadStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] bg-black text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-emerald-400">info</span>
            {downloadStatus}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Song Modal */}
      {editingSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] w-full max-w-2xl p-10 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-serif font-black text-[#2C2C2C]">{t('editSong')}</h2>
                <p className="text-[10px] font-bold text-outline/50 uppercase tracking-widest">ID: {editingSong.id}</p>
              </div>
              <button onClick={() => setEditingSong(null)} className="h-10 w-10 rounded-full bg-[#F9F7F5] flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateSong({
                ...editingSong,
                title: formData.get('title'),
                englishTitle: formData.get('englishTitle'),
                lyrics: tempLyrics,
                englishLyrics: tempTranslation
              });
            }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('chineseTitle')}</label>
                  <input 
                    name="title"
                    type="text" 
                    defaultValue={editingSong.title}
                    className="w-full p-4 rounded-2xl bg-[#F9F7F5] border-none outline-none font-bold text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('englishTitleLabel')}</label>
                  <input 
                    name="englishTitle"
                    type="text" 
                    defaultValue={editingSong.englishTitle}
                    className="w-full p-4 rounded-2xl bg-[#F9F7F5] border-none outline-none font-bold text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 flex items-center justify-between">
                    {t('chineseLyrics')}
                  </label>
                  <textarea 
                    value={tempLyrics}
                    onChange={(e) => setTempLyrics(e.target.value)}
                    className="w-full h-80 p-4 rounded-2xl bg-[#F9F7F5] border-none outline-none text-sm resize-none leading-relaxed"
                    placeholder={t('enterLyricsPlaceholder')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 flex items-center justify-between">
                    {t('aiTranslation')}
                    <span className="material-symbols-outlined text-[14px] animate-pulse">auto_awesome</span>
                  </label>
                  <textarea 
                    value={tempTranslation}
                    onChange={(e) => setTempTranslation(e.target.value)}
                    className="w-full h-80 p-4 rounded-2xl bg-[#EEEDFF]/50 border-none outline-none text-sm resize-none leading-relaxed text-[#4F46E5]"
                    placeholder={t('aiWaitPlaceholder')}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingSong(null)}
                  className="flex-1 py-4 bg-[#F9F7F5] text-on-surface font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-[#E5E0DA] transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-[#4F46E5] transition-all shadow-xl shadow-black/10"
                >
                  {t('saveChanges')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Song Preview PPT Modal */}
      {previewingSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] w-full max-w-5xl overflow-hidden shadow-2xl border border-white/20"
          >
             <div className="p-8 flex items-center justify-between border-b border-[#E5E0DA]/30">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <span className="material-symbols-outlined text-2xl">visibility</span>
                   </div>
                   <div>
                      <h2 className="text-2xl font-serif font-black text-[#2C2C2C]">{previewingSong.title} - {t('preview')}</h2>
                      <p className="text-[10px] font-bold text-outline/50 uppercase tracking-[0.2em]">
                        {previewingSong.englishTitle} · {t('totalCountPages').replace('{count}', (Math.ceil((previewingSong.lyrics?.split('\n').filter((l: string) => l.trim()).length || 0) / linesPerSlide) + 1).toString())}
                      </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="hidden md:flex items-center gap-2 px-6 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                      <span className="material-symbols-outlined text-emerald-600 text-[14px] animate-pulse">auto_awesome</span>
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{t('worshipPptDirect')}</span>
                   </div>
                   <button onClick={() => setPreviewingSong(null)} className="h-12 w-12 rounded-full bg-[#F9F7F5] flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm">
                      <span className="material-symbols-outlined">close</span>
                   </button>
                </div>
             </div>
             
             <div className="flex flex-col lg:flex-row max-h-[85vh] overflow-hidden">
                {/* Left Side: Preview Slides */}
                <div className="flex-1 p-10 bg-[#F9F7F5] overflow-y-auto no-scrollbar border-r border-[#E5E0DA]/50">
                    <div className="grid grid-cols-1 gap-8">
                      {/* Slide 1 - Cover */}
                      <div 
                        className="aspect-video rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl relative group overflow-hidden"
                        style={!(previewingSong.customBg?.url || selectedBg.url) ? { backgroundColor: `#${previewingSong.customBg?.color || selectedBg.color || '064E3B'}` } : {}}
                      >
                        {(previewingSong.customBg?.url || selectedBg.url) && (
                           <img 
                             src={previewingSong.customBg?.url || selectedBg.url} 
                             className="absolute inset-0 w-full h-full object-cover" 
                             alt="BG" 
                             referrerPolicy="no-referrer" 
                             onError={(e) => {
                               (e.target as HTMLImageElement).style.display = 'none';
                             }}
                           />
                        )}
                        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                        <h3 className="text-3xl font-serif font-black text-white mb-4 drop-shadow-lg relative z-10">{previewingSong.title}</h3>
                        <p className="text-lg text-white/60 uppercase tracking-widest relative z-10">{previewingSong.englishTitle}</p>
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10 uppercase">
                           <div className="text-[8px] text-white/40 font-black">SLIDE 01 / {t('cover')}</div>
                           {previewingSong.customBg && <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/80 text-white font-black uppercase">{t('independentBg')}</span>}
                        </div>
                      </div>
                      
                      {/* Lyrics Slide Preview */}
                      {Array.from({ length: Math.ceil((previewingSong.lyrics?.split('\n').filter((l: string) => l.trim()).length || 0) / linesPerSlide) }).map((_, slideIndex) => (
                        <div 
                          key={slideIndex}
                          className="aspect-video rounded-3xl p-10 flex flex-col justify-center text-center shadow-xl relative overflow-hidden mb-8"
                          style={!(previewingSong.customBg?.url || selectedBg.url) ? { backgroundColor: `#${previewingSong.customBg?.color || selectedBg.color || '064E3B'}` } : {}}
                        >
                          {(previewingSong.customBg?.url || selectedBg.url) && (
                            <img 
                              src={previewingSong.customBg?.url || selectedBg.url} 
                              className="absolute inset-0 w-full h-full object-cover" 
                              alt="BG" 
                              referrerPolicy="no-referrer" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>
                          
                          <div className="relative z-10 space-y-4">
                            {Array.from({ length: linesPerSlide }).map((_, pairIdx) => {
                              const lyricIdx = slideIndex * linesPerSlide + pairIdx;
                              const cnLine = previewingSong.lyrics?.split('\n')[lyricIdx];
                              const enLine = previewingSong.englishLyrics?.split('\n')[lyricIdx];
                              
                              if (!cnLine && slideIndex > 0) return null;
                              
                              return (
                                <div key={pairIdx} className="space-y-1">
                                  <p className="text-xl md:text-2xl font-serif font-black text-white leading-tight">
                                    {cnLine || (slideIndex === 0 && pairIdx === 0 ? t('firstLinePlaceholder') : "")}
                                  </p>
                                  <p className="text-white/70 text-xs md:text-base italic font-normal tracking-wide">
                                    {enLine || (slideIndex === 0 && pairIdx === 0 ? t('translatingLine') : "")}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          <div className="absolute bottom-4 left-4 text-[8px] text-white/40 font-black z-10 uppercase">SLIDE {slideIndex + 2} / {t('content')}</div>
                        </div>
                      ))}

                      {/* Slides are now generated dynamically above */}
                    </div>
                </div>

                {/* Right Side: Sidebar Settings */}
                <div className="w-full lg:w-80 bg-white p-8 flex flex-col gap-8 shadow-2xl z-10 overflow-y-auto no-scrollbar">
                   <div>
                      <div className="flex items-center justify-between mb-4">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]">1. {t('editFileName')}</h4>
                         <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">{t('liveUpdate')}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#F9F7F5] rounded-xl px-4 py-3 border border-emerald-500/20 shadow-inner">
                        <span className="material-symbols-outlined text-sm text-emerald-600">edit_note</span>
                        <input 
                          type="text"
                          value={pptVersionName}
                          onChange={(e) => setPptVersionName(e.target.value)}
                          className="bg-transparent border-none text-xs font-black text-[#2C2C2C] focus:ring-0 p-0 w-full"
                          placeholder={t('enterFileNamePlaceholder')}
                        />
                      </div>
                   </div>

                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C] mb-4">2. {t('themeLibrary')}</h4>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        {allBgOptions.map((bg) => (
                          <button 
                            key={bg.id}
                            onClick={() => {
                              if (bg.isAi) {
                                handleAiBgGen();
                              } else {
                                setSelectedBg(bg);
                              }
                            }}
                            className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${selectedBg.id === bg.id ? 'border-emerald-500 scale-105 shadow-lg' : 'border-[#E5E0DA]/30 hover:border-emerald-500/50'}`}
                          >
                            {bg.url ? (
                              <div className="w-full h-full relative">
                                <div className="absolute inset-0 bg-neutral-200 animate-pulse"></div>
                                <img 
                                  src={bg.url} 
                                  alt={bg.label} 
                                  className="w-full h-full object-cover relative z-10" 
                                  referrerPolicy="no-referrer" 
                                  onLoad={(e) => {
                                    const parent = (e.target as HTMLElement).parentElement;
                                    if (parent) {
                                      const skeleton = parent.querySelector('.animate-pulse');
                                      if (skeleton) (skeleton as HTMLElement).style.display = 'none';
                                    }
                                  }}
                                  onError={(e) => {
                                    const parent = (e.target as HTMLElement).parentElement;
                                    if (parent) {
                                      const skeleton = parent.querySelector('.animate-pulse');
                                      if (skeleton) {
                                        skeleton.classList.remove('animate-pulse');
                                        (skeleton as HTMLElement).style.backgroundColor = '#4F46E5';
                                      }
                                    }
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : bg.color ? (
                              <div className="w-full h-full" style={{ backgroundColor: `#${bg.color}` }}></div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                {isGeneratingAiBg ? (
                                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                )}
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 py-1 bg-black/40 text-[6px] font-black text-white uppercase text-center">{bg.label}</div>
                          </button>
                        ))}
                      </div>
                      
                      <label className="w-full py-2 border-2 border-dashed border-[#E5E0DA] rounded-xl flex items-center justify-center gap-2 hover:bg-[#F9F7F5] cursor-pointer transition-colors">
                          <span className="material-symbols-outlined text-sm text-outline/40">upload</span>
                          <span className="text-[9px] font-black text-outline/60 uppercase">{t('uploadImage')}</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]">3. {t('lyricOptimization')}</h4>
                      <div className="flex gap-2 p-1 bg-[#F9F7F5] rounded-xl border border-[#E5E0DA]/30">
                        {[1, 2, 3].map((val) => (
                          <button 
                            key={val}
                            onClick={() => setLinesPerSlide(val)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${linesPerSlide === val ? 'bg-white text-emerald-600 shadow-sm' : 'text-outline/40'}`}
                          >
                            {val} {t('pairsPerSlide') || '对/页'}
                          </button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]">4. {t('fileManagement')}</h4>
                      <button 
                        onClick={() => handleDownload(`${previewingSong.title}.pptx`)}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-serif font-black text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
                      >
                         <span className="material-symbols-outlined text-lg">download</span>
                         {t('exportSongPpt')}
                      </button>
                      <button 
                         onClick={() => { setEditingSong(previewingSong); setPreviewingSong(null); }}
                         className="w-full py-3 bg-[#F9F7F5] text-outline/60 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#E5E0DA] transition-all"
                      >
                         {t('editLyrics')}
                      </button>
                   </div>
                </div>
             </div>

          </motion.div>
        </div>
      )}

      {/* Add Song Modal */}
      {isAddingSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] w-full max-w-2xl p-10 shadow-2xl relative"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif font-black text-[#2C2C2C]">{t('addNewSong')}</h2>
              <button onClick={() => setIsAddingSong(false)} className="h-10 w-10 rounded-full bg-[#F9F7F5] flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* URL Fetch Section */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#4F46E5] ml-1 flex items-center gap-2">
                   <span className="material-symbols-outlined text-[14px]">link</span>
                   {t('songSourceUrl')}
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newSongUrl}
                    onChange={(e) => setNewSongUrl(e.target.value)}
                    placeholder="https://music.apple.com/... or any website" 
                    className="flex-1 p-4 rounded-2xl bg-[#EEEDFF]/30 border border-[#4F46E5]/10 outline-none font-bold text-sm" 
                  />
                  <button 
                    onClick={handleFetchLyrics}
                    disabled={isFetchingLyrics || !newSongUrl}
                    className="px-6 rounded-2xl bg-[#4F46E5] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#4338CA] transition-all disabled:opacity-50"
                  >
                    {isFetchingLyrics ? t('fetching') : t('fetchLyrics')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('chineseTitle')}</label>
                  <input 
                    type="text" 
                    value={newSongData.title}
                    onChange={(e) => setNewSongData({ ...newSongData, title: e.target.value })}
                    placeholder={t('egAmazingGraceCn')} 
                    className="w-full p-4 rounded-2xl bg-[#F9F7F5] border-none outline-none font-bold text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('englishTitleLabel')}</label>
                  <input 
                    type="text" 
                    value={newSongData.englishTitle}
                    onChange={(e) => setNewSongData({ ...newSongData, englishTitle: e.target.value })}
                    placeholder={t('egAmazingGrace')} 
                    className="w-full p-4 rounded-2xl bg-[#F9F7F5] border-none outline-none font-bold text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('chineseLyrics')}</label>
                  <textarea 
                    value={newSongData.lyrics}
                    onChange={(e) => setNewSongData({ ...newSongData, lyrics: e.target.value })}
                    placeholder={t('enterLyricsPlaceholder')}
                    className="w-full h-48 p-4 rounded-2xl bg-[#F9F7F5] border-none outline-none text-sm resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">{t('aiTranslation')}</label>
                  <textarea 
                    value={newSongData.englishLyrics}
                    onChange={(e) => setNewSongData({ ...newSongData, englishLyrics: e.target.value })}
                    placeholder={t('aiWaitPlaceholder')}
                    className="w-full h-48 p-4 rounded-2xl bg-[#EEEDFF]/50 border-none outline-none text-sm resize-none text-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsAddingSong(false)}
                  className="flex-1 py-4 bg-[#F9F7F5] text-on-surface font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-[#E5E0DA] transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSaveNewSong}
                  className="flex-[2] py-4 bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-black/10"
                >
                  {t('saveChanges')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
