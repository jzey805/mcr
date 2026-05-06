import React, { useState, useMemo } from 'react';
import { useMode } from '../contexts/ModeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UPCOMING_EVENTS, ChurchEvent } from '../constants/events';
import { addMonths, subMonths, subWeeks, addWeeks, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

import { jsPDF } from 'jspdf';

type RoleTag = string;

interface Staff {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  roles: RoleTag[];
  onLeave?: boolean;
  birthday?: string; // M-D format like "05-15"
  isTeamLeader?: boolean;
  leaderOf?: string; // The role they lead
}

interface Assignment {
  id: string;
  staffId: string;
  role: RoleTag;
  color?: string;
}

const ROLES_LIST = [
  'Preaching', 'Worship', 'Lead Singer', 'Musician', 'Usher', 
  'Sunday School Teacher', 'Kitchen', 'Cleaning', 'IT', 'Giving'
];

export default function Roster() {
  const { mode } = useMode();
  const { t } = useLanguage();
  const [view, setView] = useState<'Monthly' | 'Weekly' | 'Table' | 'Personnel'>('Monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'All' | string>('All');
  const [editingAssignment, setEditingAssignment] = useState<{dateStr: string, assignment: Assignment} | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);
  const [modalPreselectedRole, setModalPreselectedRole] = useState<string | null>(null);
  const [modalStaffId, setModalStaffId] = useState('');
  const [modalRoleId, setModalRoleId] = useState('');

  const sundays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    return days.filter(d => d.getDay() === 0);
  }, [currentDate]);

  const activeRoles = useMemo(() => {
    if (selectedRoleFilter !== 'All') return [selectedRoleFilter];
    return ROLES_LIST;
  }, [selectedRoleFilter]);

  const getInitialAssignments = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const d = (day: string) => `${year}-${month}-${day}`;
    return {
      // Assignments for May 3, 2026 (Sunday)
      [d('03')]: [
        { id: 'a1', staffId: '4', role: 'Preaching' },
        { id: 'a2', staffId: '2', role: 'Lead Singer' },
        { id: 'a5', staffId: '5', role: 'Musician' }
      ],
      // Assignments for May 10, 2026 (Sunday)
      [d('10')]: [
        { id: 'a3', staffId: '1', role: 'Sunday School Teacher' },
        { id: 'a4', staffId: '4', role: 'Preaching' },
        { id: 'a6', staffId: '2', role: 'Worship' }
      ],
      // Assignments for May 17, 2026 (Sunday)
      [d('17')]: [
        { id: 'a7', staffId: '6', role: 'IT' },
        { id: 'a8', staffId: '7', role: 'Kitchen' }
      ]
    };
  };

  const [availableRoles, setAvailableRoles] = useState<RoleTag[]>(ROLES_LIST);
  const [newRoleStr, setNewRoleStr] = useState('');

  const [staffList, setStaffList] = useState<Staff[]>([
    { id: '1', name: 'John Smith', initials: 'JS', roles: ['Sunday School Teacher', 'Preaching'], birthday: '05-10', isTeamLeader: true, leaderOf: 'Sunday School' },
    { id: '2', name: 'Sarah Michaels', initials: 'SM', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80', roles: ['Worship', 'Lead Singer'], birthday: '06-15', isTeamLeader: true, leaderOf: 'Worship' },
    { id: '3', name: 'Mark Rivera', initials: 'MR', roles: ['Usher', 'Cleaning'], onLeave: true, birthday: '12-25' },
    { id: '4', name: 'David Chen', initials: 'DC', roles: ['Preaching', 'IT'], birthday: '01-20', isTeamLeader: true, leaderOf: 'Media' },
    { id: '5', name: 'Yuki', initials: 'YK', roles: ['Worship', 'Musician'], birthday: '05-22' },
    { id: '6', name: 'Alex', initials: 'AL', roles: ['Assistant Teacher', 'IT'], birthday: '03-12' },
    { id: '7', name: 'Hannah', initials: 'HN', roles: ['Kitchen', 'Giving'], birthday: '08-15', isTeamLeader: true, leaderOf: 'Kitchen' },
  ]);

  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>(() => getInitialAssignments(new Date()));
  const [availability, setAvailability] = useState<Record<string, 'busy' | 'available' | 'none'>>({});
  const currentUser = staffList[1]; // Sarah Michaels as mock current user
  const [draggedStaffId, setDraggedStaffId] = useState<string | null>(null);
  const [highlightedStaffId, setHighlightedStaffId] = useState<string | null>(null);
  const [showStaffPool, setShowStaffPool] = useState(true);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ dateStr: string, staffId: string } | null>(null);

  const toggleAvailability = (dateStr: string) => {
    if (mode !== 'Staff') return;
    setAvailability(prev => {
      const current = prev[dateStr] || 'none';
      const next: Record<string, 'busy' | 'available' | 'none'> = { ...prev };
      if (current === 'none') next[dateStr] = 'available';
      else if (current === 'available') next[dateStr] = 'busy';
      else delete next[dateStr];
      return next;
    });
  };

  const handlePrev = () => {
    setCurrentDate(prev => view === 'Monthly' ? subMonths(prev, 1) : subWeeks(prev, 1));
  };
  
  const handleNext = () => {
    setCurrentDate(prev => view === 'Monthly' ? addMonths(prev, 1) : addWeeks(prev, 1));
  };

  const handlePrint = () => {
    handleExportPDF();
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('roster-pdf-export-source');
    if (!element) return;

    // Show a simple loading indicator
    const btn = document.querySelector('[title="Export as PDF"]');
    const originalContent = btn?.innerHTML;
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>';

    try {
      const { toCanvas } = await import('html-to-image');
      
      // Temporarily reveal the element for html-to-image
      element.style.position = 'static';
      element.style.left = '0';
      element.style.zIndex = '1000';
      
      const canvas = await toCanvas(element, {
        pixelRatio: 2,
        backgroundColor: '#F4F1EE',
      });
      
      // Hide it back
      element.style.position = 'fixed';
      element.style.left = '-5000px';
      element.style.zIndex = '-1000';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`roster-${format(currentDate, 'yyyy-MM')}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF production failed. Try printing the page or use a desktop browser.');
    } finally {
      if (btn && originalContent) btn.innerHTML = originalContent;
    }
  };

  const calendarDays = useMemo(() => {
    if (view === 'Monthly') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, view]);

  const handleDragStart = (e: React.DragEvent, staffId: string) => {
    if (mode !== 'Manager') return;
    setDraggedStaffId(staffId);
    e.dataTransfer.setData('text/plain', staffId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (mode !== 'Manager') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
    if (mode !== 'Manager') return;
    e.preventDefault();
    const sourceDate = e.dataTransfer.getData('sourceDate');
    const asgnId = e.dataTransfer.getData('asgnId');
    const staffId = e.dataTransfer.getData('text/plain');

    if (sourceDate && asgnId) {
      // Move existing assignment
      setAssignments(prev => {
        const next = { ...prev };
        const sourceDay = prev[sourceDate] || [];
        const asgnToMove = sourceDay.find(a => a.id === asgnId);
        
        if (asgnToMove) {
          next[sourceDate] = sourceDay.filter(a => a.id !== asgnId);
          const targetDay = next[targetDateStr] || [];
          next[targetDateStr] = [...targetDay, asgnToMove];
        }
        return next;
      });
      return;
    }

    if (!staffId) return;

    const staff = staffList.find(s => s.id === staffId);
    if (!staff || staff.onLeave) return;

    if (staff.roles.length === 1) {
      addAssignment(targetDateStr, staffId, staff.roles[0]);
    } else if (staff.roles.length > 1) {
      setPendingAssignment({ dateStr: targetDateStr, staffId });
      setShowRoleModal(true);
    }
  };

  const addAssignment = (dateStr: string, staffId: string, role: RoleTag) => {
    if (mode !== 'Manager') return;
    setAssignments(prev => {
      const dayAssignments = prev[dateStr] || [];
      return {
        ...prev,
        [dateStr]: [...dayAssignments, { id: Date.now().toString(), staffId, role }]
      };
    });
  };

  const handleRemoveAssignment = (dateStr: string, assignmentId: string) => {
    if (mode !== 'Manager') return;
    setAssignments(prev => ({
      ...prev,
      [dateStr]: (prev[dateStr] || []).filter(a => a.id !== assignmentId)
    }));
  };

  const toggleStaffRole = (staffId: string, role: RoleTag) => {
    setStaffList(prev => prev.map(staff => {
      if (staff.id === staffId) {
        const hasRole = staff.roles.includes(role);
        return {
          ...staff,
          roles: hasRole ? staff.roles.filter(r => r !== role) : [...staff.roles, role]
        };
      }
      return staff;
    }));
  };

  const getBackgroundColor = (role: RoleTag, overrideColor?: string) => {
    if (overrideColor) return overrideColor;
    const roleMap: Record<string, string> = {
      'Preaching': '#000000',
      'Worship': '#2D5BFF',
      'Lead Singer': '#60A5FA',
      'Sunday School Teacher': '#10B981',
      'Usher': '#F59E0B',
      'Kitchen': '#F97316',
      'IT': '#475569',
    };
    return roleMap[role] || '#8D9494';
  };

  const getHoliday = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    // Fixed dates & Australian Public Holidays
    if (month === 1 && day === 1) return 'New Year';
    if (month === 1 && day === 26) return 'Australia Day';
    if (month === 2 && day === 14) return "Valentine's";
    if (month === 4 && day === 25) return 'ANZAC Day';
    if (month === 10 && day === 1) return 'National Day';
    if (month === 12 && day === 25) return 'Christmas';
    if (month === 12 && day === 26) return 'Boxing Day';
    
    // Mothers Day (2nd Sunday of May) - AU/US
    if (month === 5) {
      const firstDay = new Date(year, 4, 1);
      const firstSundayOffset = (7 - firstDay.getDay()) % 7;
      const firstSunday = 1 + firstSundayOffset;
      const secondSunday = firstSunday + 7;
      if (day === secondSunday) return "Mother's Day";
      
      // Labor Day (QLD/NT - 1st Monday in May)
      const firstMonday = 1 + (8 - firstDay.getDay()) % 7;
      if (day === firstMonday) return "Labor Day";
    }

    // King's Birthday (2nd Monday of June - typical for AU)
    if (month === 6) {
      const firstDay = new Date(year, 5, 1);
      const firstMonday = 1 + (8 - firstDay.getDay()) % 7;
      const secondMonday = firstMonday + 7;
      if (day === secondMonday) return "King's Birthday";
    }

    // Fathers Day (1st Sunday of September for AU)
    if (month === 9) {
      const firstDay = new Date(year, 8, 1);
      const firstSunday = 1 + (7 - firstDay.getDay()) % 7;
      if (day === firstSunday) return "Father's Day";
    }

    // Religious & Seasonal Public Holidays
    if (year === 2024) {
      if (month === 3 && day === 24) return 'Palm Sunday';
      if (month === 3 && day === 29) return 'Good Friday';
      if (month === 3 && day === 31) return 'Easter';
      if (month === 10 && day === 16) return 'Sukkot';
    } else if (year === 2025) {
      if (month === 4 && day === 13) return 'Palm Sunday';
      if (month === 4 && day === 18) return 'Good Friday';
      if (month === 4 && day === 20) return 'Easter';
      if (month === 10 && day === 6) return 'Sukkot';
    } else if (year === 2026) {
      if (month === 3 && day === 29) return 'Palm Sunday';
      if (month === 4 && day === 3) return 'Good Friday';
      if (month === 4 && day === 4) return 'Easter Saturday';
      if (month === 4 && day === 5) return 'Easter Sunday';
      if (month === 4 && day === 6) return 'Easter Monday';
      if (month === 5 && day === 24) return 'Pentecost';
      if ((month === 9 && (day >= 26)) || (month === 10 && day <= 4)) return 'Sukkot';
    }

    return null;
  };

  const getBirthday = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const md = `${month}-${day}`;
    return staffList.filter(s => s.birthday === md);
  };


  const getRoleColor = (role: RoleTag) => {
    const roleMap: Record<string, string> = {
      'Preaching': 'bg-black text-white',
      'Worship': 'bg-primary text-on-primary',
      'Lead Singer': 'bg-primary/20 text-primary border border-primary/30',
      'Sunday School Teacher': 'bg-secondary text-on-secondary',
      'Usher': 'bg-tertiary text-on-tertiary',
      'Kitchen': 'bg-orange-500 text-white',
      'IT': 'bg-slate-700 text-white',
    };
    return roleMap[role] || 'bg-surface-container-highest text-on-surface';
  };

  const filteredStaffPool = useMemo(() => {
    if (selectedRoleFilter === 'All') return staffList;
    return staffList.filter(s => s.roles.includes(selectedRoleFilter));
  }, [staffList, selectedRoleFilter]);

  const autoSchedule = () => {
    setAssignments(prev => {
      const next = { ...prev };
      sundays.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayAsgns = next[dateStr] || [];
        
        // Shuffle staff for more variety
        const shuffledStaff = [...staffList].sort(() => Math.random() - 0.5);
        
        activeRoles.forEach(role => {
          if (dayAsgns.some(a => a.role === role)) return;

          const candidate = shuffledStaff.find(s => 
            s.roles.includes(role) && 
            !s.onLeave && 
            !dayAsgns.some(a => a.staffId === s.id)
          );

          if (candidate) {
            dayAsgns.push({ id: `auto-${Date.now()}-${Math.random()}`, staffId: candidate.id, role });
          }
        });
        next[dateStr] = [...dayAsgns];
      });
      return next;
    });
    setView('Table');
  };

  const clearSchedule = () => {
    if (mode !== 'Manager') return;
    if (!window.confirm('Clear all assignments for this month?')) return;
    setAssignments(prev => {
      const next = { ...prev };
      sundays.forEach(date => {
        delete next[format(date, 'yyyy-MM-dd')];
      });
      return next;
    });
  };

  return (
    <div className="flex w-full flex-col bg-surface min-h-full">
      {/* Dynamic Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\:hidden { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .table-container { width: 100% !important; overflow: visible !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #eee !important; padding: 12px !important; }
          .sticky { position: static !important; }
          .shadow-xl, .shadow-md, .shadow-sm { shadow: none !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Page Header - Ultra Compact */}
      <div className="px-4 py-2.5 border-b border-outline-variant/10 bg-white/50 backdrop-blur-sm sticky top-0 z-[80] print:hidden">
        <div className="flex flex-row items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2">
             <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                <span className="material-symbols-outlined filled text-[18px]">calendar_month</span>
             </div>
             <div className="hidden sm:block">
                <h1 className="text-lg font-serif font-black text-on-surface leading-tight tracking-tight">{t('serviceRoster')}</h1>
                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-outline/60 truncate max-w-[120px]">
                   {t('rosterDesc')}
                </p>
             </div>
          </div>

          <div className="flex-1 flex flex-row items-center justify-center gap-1.5 px-6">
             {/* View Switcher - Center */}
             <div className="flex items-center gap-0.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest/50 p-1 shadow-sm">
                {[
                  { id: 'Monthly', label: '', icon: 'calendar_month' },
                  { id: 'Personnel', label: '', icon: 'groups' },
                  { id: 'Table', label: '', icon: 'table_rows' }
                ].map(v => (
                  <button 
                    key={v.id}
                    onClick={() => setView(v.id as any)}
                    className={`flex items-center justify-center rounded-md h-8 w-8 transition-all ${view === v.id ? 'bg-on-surface text-white shadow-md' : 'text-outline hover:bg-surface-container'}`}
                    title={t(v.id.toLowerCase()) || v.id}
                  >
                    <span className="material-symbols-outlined text-[16px]">{v.icon}</span>
                  </button>
                ))}
             </div>

             {view !== 'Personnel' && (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-outline-variant/10 bg-surface-container-low/50 shadow-sm">
                        <button onClick={handlePrev} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-on-surface hover:text-white transition-all"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
                        <div className="min-w-[100px] text-center">
                            <span className="block font-serif font-black text-[12px] text-on-surface uppercase tracking-wider leading-none">{format(currentDate, 'MMMM')}</span>
                        </div>
                        <button onClick={handleNext} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-on-surface hover:text-white transition-all"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
                    </div>

                    <div className="h-8 w-px bg-outline-variant/20 mx-1" />

                    {/* Personnel Highlight Filter */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/20 bg-white shadow-sm min-w-[180px] group hover:border-primary/50 transition-all">
                        <span className="material-symbols-outlined text-[16px] text-primary/60 group-hover:text-primary transition-colors">person_search</span>
                        <select 
                            value={highlightedStaffId || ''} 
                            onChange={(e) => setHighlightedStaffId(e.target.value || null)}
                            className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-on-surface focus:ring-0 cursor-pointer w-full appearance-none outline-none"
                        >
                            <option value="">Search Member...</option>
                            {staffList.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                <option key={s.id} value={s.id} className="text-on-surface py-2">{s.name}</option>
                            ))}
                        </select>
                        {highlightedStaffId ? (
                            <button 
                                onClick={() => setHighlightedStaffId(null)}
                                className="w-5 h-5 rounded-full bg-surface-container hover:bg-error hover:text-white flex items-center justify-center transition-all shrink-0"
                            >
                                <span className="material-symbols-outlined text-[12px]">close</span>
                            </button>
                        ) : (
                            <span className="material-symbols-outlined text-[14px] text-outline/30 pointer-events-none">expand_more</span>
                        )}
                    </div>

                    <div className="h-8 w-px bg-outline-variant/20 mx-1" />

                    {/* Role Filter Dropdown */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/20 bg-white shadow-sm min-w-[160px] group hover:border-primary/50 transition-all">
                        <span className="material-symbols-outlined text-[16px] text-primary/60 group-hover:text-primary transition-colors">filter_list</span>
                        <select 
                            value={selectedRoleFilter} 
                            onChange={(e) => setSelectedRoleFilter(e.target.value)}
                            className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-on-surface focus:ring-0 cursor-pointer w-full appearance-none outline-none"
                        >
                            <option value="All">All Departments</option>
                            {availableRoles.map(role => (
                                <option key={role} value={role} className="text-on-surface py-2">{role}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined text-[14px] text-outline/30 pointer-events-none">expand_more</span>
                    </div>
                </div>
             )}
          </div>

          <div className="flex items-center gap-2">
            <button 
                 onClick={handleExportPDF}
                 className="flex items-center gap-1 px-4 py-2.5 rounded-lg bg-surface-container text-on-surface transition-all text-[9px] font-black uppercase tracking-widest border border-outline-variant/20 shadow-sm hover:bg-white"
                 title="Download PDF"
            >
                 <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                 <span className="hidden lg:inline ml-1">{t('exportPDF') || 'Export Table PDF'}</span>
            </button>
            <button 
                 onClick={() => window.print()}
                 className="flex items-center gap-1 px-4 py-2.5 rounded-lg bg-on-surface text-white transition-all text-[9px] font-black uppercase tracking-widest border border-outline-variant/20 shadow-sm hover:opacity-90"
                 title="Print Roster"
            >
                 <span className="material-symbols-outlined text-[16px]">print</span>
                 <span className="hidden lg:inline ml-1">{t('print') || 'Print'}</span>
            </button>
            
            {mode === 'Manager' && view !== 'Personnel' && (
                <button 
                    onClick={autoSchedule}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-lg bg-primary text-white transition-all text-[9px] font-black uppercase tracking-widest border border-primary/20 shadow-md hover:scale-105 active:scale-95"
                >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    <span className="hidden sm:inline">Auto</span>
                </button>
             )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-surface-container-lowest/50 relative">
        {/* Hidden Table for PDF Export - Optimized for high-fidelity mirroring of UI */}
        <div id="roster-pdf-export-source" className="fixed -left-[5000px] top-0 bg-[#F4F1EE] p-12 min-w-[1400px]" style={{ zIndex: -1000 }}>
            <div className="mb-10">
              <h1 className="text-4xl font-serif font-black text-[#2C2C2C] mb-2">GraceFlow Church</h1>
              <p className="text-[12px] font-black uppercase tracking-[0.25em] text-[#8B7E74]">Monthly Service Roster • {format(currentDate, 'MMMM yyyy')}</p>
            </div>
            
            <table className="w-full border-separate border-spacing-y-4 border-spacing-x-2">
                <thead>
                    <tr>
                        <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-[#8B7E74]">Date</th>
                        {activeRoles.map(role => (
                            <th key={role} className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-[#8B7E74]">{role}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sundays.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dayAsgns = assignments[dateStr] || [];
                        return (
                            <tr key={dateStr}>
                                <td className="p-4 bg-white rounded-l-[24px] border-y border-l border-[#E5E0DA] min-w-[140px]">
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl font-serif font-black text-[#2C2C2C] leading-none mb-1">{format(date, 'd')}</span>
                                        <div className="flex flex-col justify-center">
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-[#8B7E74] leading-none">{format(date, 'MMMM')}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-[#2D5BFF] mt-1 leading-none">{format(date, 'EEEE')}</span>
                                        </div>
                                    </div>
                                </td>
                                {activeRoles.map((role, idx) => {
                                    const asgn = dayAsgns.find(a => a.role === role);
                                    const staff = asgn ? staffList.find(s => s.id === asgn.staffId) : null;
                                    const isLast = idx === activeRoles.length - 1;
                                    
                                    return (
                                        <td key={role} className={`p-4 bg-white ${isLast ? 'rounded-r-[24px] border-r' : ''} border-y border-[#E5E0DA] align-middle text-center`}>
                                            {asgn ? (
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="text-[12px] font-bold text-[#2C2C2C] uppercase tracking-tight">{staff?.name}</div>
                                                </div>
                                            ) : (
                                                <div className="h-8 border-b border-dashed border-[#F4F1EE]"></div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="mt-12 pt-8 border-t border-[#E5E0DA] flex justify-between items-center opacity-50">
                <p className="text-[10px] font-bold uppercase tracking-widest">GraceFlow System • Service Roster</p>
                <p className="text-[10px] font-bold uppercase tracking-widest">Generated {format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
            </div>
        </div>

        {/* Main View Area - Optimized for one-page view */}
        <div className="flex-1 overflow-hidden bg-surface-container/10 p-2 md:p-4">
           <div className={`h-full w-full max-w-[1600px] mx-auto ${view !== 'Personnel' ? 'rounded-2xl border border-outline-variant/10 bg-white shadow-xl transition-all flex flex-col overflow-hidden' : ''}`} id="roster-table-container">
              {/* Day Modal */}
              <AnimatePresence>
                {selectedDayDetail && (
                  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setSelectedDayDetail(null)} 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center text-primary font-serif font-black text-2xl">
                                    {format(parseISO(selectedDayDetail), 'd')}
                                </div>
                                <div>
                                    <h3 className="text-xl font-serif font-black">{format(parseISO(selectedDayDetail), 'MMMM d, yyyy')}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-outline/50">{getHoliday(parseISO(selectedDayDetail)) || 'Service Day'}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDayDetail(null)} className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-6">
                            {mode === 'Manager' && (
                                <section>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Add Staff Assignment</h4>
                                    <div className="grid grid-cols-2 gap-3 p-4 rounded-3xl bg-surface-container shadow-inner">
                                        <select 
                                            value={modalStaffId}
                                            className="bg-white border-none rounded-xl text-xs p-2.5 focus:ring-2 ring-primary/20"
                                            onChange={(e) => {
                                                const staffId = e.target.value;
                                                const role = modalRoleId || modalPreselectedRole || (selectedRoleFilter !== 'All' ? selectedRoleFilter : availableRoles[0]);
                                                if (staffId && role) {
                                                    addAssignment(selectedDayDetail || '', staffId, role);
                                                    setModalStaffId('');
                                                } else {
                                                    setModalStaffId(staffId);
                                                }
                                            }}
                                        >
                                            <option value="">Select Member...</option>
                                            {staffList.filter(s => !s.onLeave).sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        <select 
                                            value={modalRoleId || modalPreselectedRole || (selectedRoleFilter !== 'All' ? selectedRoleFilter : availableRoles[0])}
                                            className="bg-white border-none rounded-xl text-xs p-2.5 focus:ring-2 ring-primary/20"
                                            onChange={(e) => setModalRoleId(e.target.value)}
                                        >
                                            {availableRoles.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                </section>
                            )}

                            <section>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline/60 mb-4">Personnel on Duty</h4>
                                <div className="space-y-3">
                                    {assignments[selectedDayDetail]?.length > 0 ? (
                                        assignments[selectedDayDetail].map(asgn => {
                                            const staff = staffList.find(s => s.id === asgn.staffId);
                                            return (
                                                <div key={asgn.id} className="flex items-center gap-4 p-4 rounded-[28px] bg-surface-container-low border border-outline-variant/10 group/item">
                                                    <div className="w-12 h-12 rounded-[18px] bg-white shadow-sm flex items-center justify-center font-serif font-black text-xs overflow-hidden border border-primary/10">
                                                        {staff?.avatar ? <img src={staff.avatar} className="w-full h-full object-cover" alt="" /> : staff?.initials}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-bold text-on-surface uppercase tracking-tight">{staff?.name}</span>
                                                            {staff?.isTeamLeader && (
                                                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[7px] font-black uppercase tracking-widest">Lead</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-outline/60">{asgn.role}</span>
                                                    </div>
                                                    {mode === 'Manager' && (
                                                        <button 
                                                            onClick={() => handleRemoveAssignment(selectedDayDetail, asgn.id)}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-error hover:text-white transition-all text-outline/20"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    )}
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getBackgroundColor(asgn.role) }} />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-20 text-center">
                                            <span className="material-symbols-outlined text-[48px] text-outline/20 mb-4">event_busy</span>
                                            <p className="text-sm font-medium text-outline/40">No personnel assigned for this day.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="p-8 bg-surface-container-lowest border-t border-outline-variant/10">
                            <button 
                                onClick={() => setSelectedDayDetail(null)}
                                className="w-full py-4 rounded-2xl bg-on-surface text-white text-[11px] font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {view === 'Personnel' ? (
                <div className="h-full overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 p-4">
                  {filteredStaffPool.map(staff => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={staff.id}
                      className="group relative p-8 rounded-[40px] bg-white border border-outline-variant/20 shadow-xl shadow-black/[0.02] hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10 group-hover:bg-primary/10 transition-colors"></div>
                      
                      <div className="flex flex-col items-center mb-8">
                        {staff.isTeamLeader && (
                          <div className="mb-4 px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2">
                             <span className="material-symbols-outlined text-[14px]">stars</span>
                             {staff.leaderOf} Team Leader
                          </div>
                        )}
                        <div className="relative mb-6">
                           <div className="w-28 h-28 rounded-[36px] bg-white shadow-2xl p-1.5 ring-1 ring-black/[0.03]">
                             <div className="w-full h-full rounded-[30px] border-2 border-primary/10 flex items-center justify-center font-serif font-black text-3xl text-primary overflow-hidden bg-surface-container-low/30 uppercase">
                                {staff.avatar ? (
                                  <img src={staff.avatar} className="w-full h-full object-cover" alt="" />
                                ) : staff.initials}
                             </div>
                           </div>
                           {staff.onLeave && (
                             <div className="absolute -bottom-2 -right-2 bg-error text-white px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg ring-4 ring-white">
                               Leave
                             </div>
                           )}
                        </div>
                        <h4 className="font-serif text-2xl font-black text-on-surface mb-1 group-hover:text-primary transition-colors">{staff.name}</h4>
                        {staff.isTeamLeader ? (
                          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-4 py-1.5 rounded-full inline-block mb-1 border border-primary/10">
                             <span className="material-symbols-outlined text-[12px] align-middle mr-1">stars</span>
                             {staff.leaderOf} Leader
                          </p>
                        ) : (
                          <p className="text-[10px] font-black text-outline/50 uppercase tracking-[0.2em]">Pastor / Member</p>
                        )}
                      </div>

                      <div className="space-y-4">
                         <div className="flex flex-wrap justify-center gap-1.5">
                           {staff.roles.map(role => (
                             <span key={role} className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-surface-container-low text-outline border border-outline-variant/10">
                               {t(role.charAt(0).toLowerCase() + role.slice(1).replace(/ /g, '')) || role}
                             </span>
                           ))}
                         </div>
                      </div>

                      <div className="mt-10 pt-8 border-t border-outline-variant/10 flex items-center justify-center gap-4">
                         <button className="h-11 w-11 rounded-2xl flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-primary hover:text-white transition-all">
                            <span className="material-symbols-outlined text-[20px]">mail</span>
                         </button>
                         <button className="h-11 w-11 rounded-2xl flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-primary hover:text-white transition-all">
                            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                         </button>
                         <button className="h-11 w-11 rounded-2xl flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-primary hover:text-white transition-all">
                            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                         </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : view === 'Table' ? (
                <div className="overflow-x-auto w-full no-scrollbar pb-32">
                  {(() => {
                    const tableRoles = mode === 'Staff' 
                      ? currentUser.roles 
                      : (selectedRoleFilter === 'All' ? activeRoles : activeRoles.filter(r => r === selectedRoleFilter));
                    return (
                      <table className="w-full border-separate border-spacing-x-0 border-spacing-y-0">
                        <thead>
                          <tr className="sticky top-0 z-40 bg-white">
                            <th className="sticky left-0 z-50 bg-white p-4 text-left w-[120px] border-b border-outline-variant/20 border-r border-outline-variant/10 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Service Date</span>
                            </th>
                            {tableRoles.map((role) => (
                              <th key={role} className="p-4 text-center border-b border-outline-variant/20 min-w-[220px] bg-white">
                                <div className="flex flex-col items-center justify-center gap-1 group">
                                   <span className="material-symbols-outlined text-[18px] text-primary/40">
                                     {
                                       role === 'Preaching' ? 'campaign' : 
                                       role === 'Worship' ? 'music_note' : 
                                       role === 'Usher' ? 'hail' : 
                                       role === 'Kitchen' ? 'local_dining' : 
                                       role === 'Cleaning' ? 'mop' : 
                                       role === 'IT' ? 'terminal' : 
                                       role === 'Giving' ? 'payments' :
                                       role === 'Sunday School Teacher' ? 'school' :
                                       role === 'Lead Singer' ? 'record_voice_over' :
                                       role === 'Musician' ? 'music_note' :
                                       'person'
                                     }
                                   </span>
                                   <span className="text-[9px] font-black uppercase tracking-widest text-on-surface">{t(role.charAt(0).toLowerCase() + role.slice(1).replace(/ /g, '')) || role}</span>
                                </div>
                              </th>
                            ))}
                            {/* Filler cell */}
                            <th className="border-b border-outline-variant/20 bg-white w-full"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {sundays.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const dayAsgns = assignments[dateStr] || [];
                            return (
                              <tr key={dateStr} className="group hover:bg-surface-container-lowest/50 transition-colors">
                                <td className="sticky left-0 z-40 bg-white p-4 group-hover:bg-surface-container-lowest transition-all border-b border-outline-variant/10 border-r border-outline-variant/10 shadow-[2px_0_10px_rgba(0,0,0,0.02)] service-date-cell">
                                  <div className="flex flex-row items-center gap-3 leading-none">
                                    <span className="text-3xl font-serif font-black text-on-surface tracking-tighter date-number">{format(date, 'd')}</span>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-outline/60 date-month">{format(date, 'MMMM')}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-primary mt-0.5">{format(date, 'EEEE')}</span>
                                    </div>
                                  </div>
                                </td>
                                {tableRoles.map(role => {
                                  const roleAsgn = dayAsgns.find(a => a.role === role);
                                  const isUserAsgn = roleAsgn?.staffId === currentUser.id;
                                  const staff = roleAsgn ? staffList.find(s => s.id === roleAsgn.staffId) : null;
                                  const isHighlighted = highlightedStaffId && staff?.id === highlightedStaffId;
                                  
                                  if (mode === 'Staff' && roleAsgn && !isUserAsgn) {
                                    return <td key={role} className="p-3 border-b border-outline-variant/10 min-w-[220px]"></td>;
                                  }

                                  return (
                                <td 
                                  key={role} 
                                  className="p-3 border-b border-outline-variant/10 min-w-[220px]"
                                >
                                  {roleAsgn ? (
                                    <div 
                                      className={`p-3 rounded-2xl flex items-center gap-3 shadow-sm border transition-all duration-300 assignment-card ${isHighlighted ? 'bg-primary text-white border-primary shadow-xl scale-[1.05] ring-4 ring-primary/20 z-10' : 'bg-surface-container-low border-outline-variant/5'}`}
                                    >
                                      <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-serif font-black text-xs shrink-0 overflow-hidden text-primary avatar-mini">
                                         {staff?.avatar ? <img src={staff.avatar} className="w-full h-full object-cover" alt="" /> : staff?.initials}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className={`text-[11px] font-bold uppercase tracking-tight truncate staff-name ${isHighlighted ? 'text-white' : 'text-on-surface'}`}>{staff?.name}</h5>
                                        <p className={`text-[8px] font-black uppercase tracking-widest truncate role-name ${isHighlighted ? 'text-white/60' : 'text-outline/60'}`}>{role}</p>
                                      </div>
                                      {mode === 'Manager' && (
                                        <button 
                                          onClick={() => handleRemoveAssignment(dateStr, roleAsgn.id)}
                                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all print:hidden ${isHighlighted ? 'bg-white/20 hover:bg-white/40 text-white' : 'hover:bg-error hover:text-white text-outline/20'}`}
                                        >
                                          <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div 
                                      onClick={() => {
                                        setModalPreselectedRole(role);
                                        setSelectedDayDetail(dateStr);
                                      }}
                                      className="h-14 rounded-2xl border-2 border-dashed border-outline-variant/5 flex items-center justify-center hover:bg-surface-container-low transition-colors cursor-pointer group/add placeholder-box"
                                    >
                                      <span className="material-symbols-outlined text-outline/10 group-hover/add:text-primary/30 transition-colors print:hidden">add_circle</span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border-b border-outline-variant/10"></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 border-b border-outline-variant/10 bg-surface-container-low/20 shrink-0">
                    {[t('sunday'), t('mon'), t('tue'), t('wed'), t('thu'), t('friday'), t('saturday')].map(day => (
                      <div key={day} className="py-2 text-center text-[9px] font-black uppercase tracking-[0.2em] text-outline border-r border-outline-variant/5 last:border-r-0">{day}</div>
                    ))}
                  </div>

                  <div className={`grid grid-cols-7 h-full grow divide-x divide-y divide-outline-variant/10 border-t border-outline-variant/10 bg-white overflow-hidden`}>
                    {calendarDays.map((date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dayAsgns = assignments[dateStr] || [];
                        const userAvailability = availability[dateStr];
                        
                        // In Staff mode, only show current user's assignments
                        const displayAssignments = mode === 'Staff' 
                          ? dayAsgns.filter(a => a.staffId === currentUser.id)
                          : dayAsgns.filter(asgn => selectedRoleFilter === 'All' || asgn.role === selectedRoleFilter);

                        const isSunday = date.getDay() === 0;
                        const isCurrentMonth = isSameMonth(date, currentDate);

                        return (
                          <div 
                            key={dateStr}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, dateStr)}
                            onClick={() => {
                              if (mode === 'Staff') {
                                toggleAvailability(dateStr);
                              } else {
                                setSelectedDayDetail(dateStr);
                              }
                            }}
                            className={`p-1.5 transition-all group flex flex-col cursor-pointer ring-inset hover:ring-2 hover:ring-primary/40 ${!isCurrentMonth ? 'bg-surface-container-low/30 opacity-30 shadow-inner' : isSunday ? 'bg-primary/[0.02]' : 'hover:bg-primary/[0.01]'} ${userAvailability === 'available' ? 'bg-secondary/5 ring-1 ring-inset ring-secondary/20' : userAvailability === 'busy' ? 'bg-error/5 ring-1 ring-inset ring-error/20' : ''}`}
                          >
                            <div className="flex flex-col gap-1 mb-1">
                                <div className="flex items-center justify-between text-[9px]">
                                    <div className="flex items-center gap-1">
                                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black transition-all ${isToday(date) ? 'bg-primary text-white shadow-sm' : isSunday ? 'text-primary' : 'text-outline/40'}`}>
                                        {format(date, 'd')}
                                      </span>
                                      {userAvailability && (
                                        <div className={`px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-0.5 ${userAvailability === 'available' ? 'bg-secondary text-white' : 'bg-error text-white'}`}>
                                          <span className="material-symbols-outlined text-[8px]">{userAvailability === 'available' ? 'check_circle' : 'block'}</span>
                                          {userAvailability === 'available' ? 'Free' : 'Busy'}
                                        </div>
                                      )}
                                    </div>
                                    {displayAssignments.length > 0 && <span className="w-1 h-1 rounded-full bg-primary/40" />}
                                </div>
                                
                                <div className="flex flex-wrap gap-1 min-h-[14px]">
                                  {getHoliday(date) && (
                                    <span className="text-[9px] font-black uppercase text-white bg-error px-2 py-1 rounded shadow-md shrink-0 whitespace-nowrap">
                                      {getHoliday(date)}
                                    </span>
                                  )}
                                  {getBirthday(date).length > 0 && (
                                    <span className="text-[6px] font-black uppercase text-secondary bg-secondary/5 px-1 py-0.5 rounded border border-secondary/5 flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                                      <span className="material-symbols-outlined text-[8px]">cake</span>
                                      {getBirthday(date).length === 1 ? getBirthday(date)[0].name : `${getBirthday(date).length} Birthdays`}
                                    </span>
                                  )}
                                </div>
                            </div>

                             <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                                {/* Assignments */}
                                {displayAssignments.map(asgn => {
                                  const staff = staffList.find(s => s.id === asgn.staffId);
                                  const isHighlighted = highlightedStaffId === staff?.id;
                                  return (
                                    <motion.div 
                                        initial={{ scale: 0.98, opacity: 0 }}
                                        animate={{ 
                                          scale: isHighlighted ? 1.02 : 1, 
                                          opacity: 1 
                                        }}
                                        key={asgn.id}
                                        onClick={() => {
                                          if (mode === 'Manager') {
                                            setEditingAssignment({ dateStr, assignment: asgn });
                                          }
                                        }}
                                        className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tight flex items-center justify-between shadow-sm group/item border border-black/5 transition-all text-white cursor-pointer
                                          ${isHighlighted ? 'ring-4 ring-primary/40 z-10 scale-[1.05] brightness-125' : ''}
                                        `}
                                        style={{ backgroundColor: getBackgroundColor(asgn.role, asgn.color) }}
                                    >
                                        <div className="flex-1 min-w-0 flex flex-col py-0.5">
                                          <span className={`truncate leading-tight text-[9px] font-bold ${isHighlighted ? 'text-white drop-shadow-md' : 'text-white'}`}>{staff?.name}</span>
                                          <span className={`text-[7px] opacity-80 leading-tight mt-0.5 ${isHighlighted ? 'text-white drop-shadow-sm' : 'text-white/70'}`}>{asgn.role}</span>
                                        </div>
                                        {mode === 'Manager' && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveAssignment(dateStr, asgn.id);
                                            }}
                                            className="opacity-0 group-hover/item:opacity-100 transition-all text-white/60 hover:text-white"
                                          >
                                            <span className="material-symbols-outlined text-[8px]">close</span>
                                          </button>
                                        )}
                                    </motion.div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </>
              )}
           </div>
        </div>
      </div>

      {/* Multiple Roles Modal */}
      <AnimatePresence>
         {showRoleModal && pendingAssignment && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRoleModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl overflow-hidden"
              >
                 <header className="mb-10 text-center">
                    <div className="w-20 h-20 rounded-[30px] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 text-3xl font-black">
                       {staffList.find(s => s.id === pendingAssignment.staffId)?.initials}
                    </div>
                    <h3 className="text-2xl font-serif font-black mb-2">Assign Role</h3>
                    <p className="text-sm text-outline font-medium tracking-tight">Select which role {staffList.find(s => s.id === pendingAssignment.staffId)?.name} will perform.</p>
                 </header>

                 <div className="space-y-3">
                    {staffList.find(s => s.id === pendingAssignment.staffId)?.roles.map(role => (
                      <button 
                        key={role}
                        onClick={() => {
                          addAssignment(pendingAssignment.dateStr, pendingAssignment.staffId, role);
                          setShowRoleModal(false);
                          setPendingAssignment(null);
                        }}
                        className={`w-full p-6 rounded-[32px] text-xs font-black uppercase tracking-[0.2em] transition-all border-2 text-center ${getRoleColor(role)} hover:scale-[1.02] active:scale-95`}
                      >
                        {role}
                      </button>
                    ))}
                 </div>

                 <button onClick={() => setShowRoleModal(false)} className="mt-8 w-full text-[10px] font-black uppercase tracking-widest text-outline py-4 hover:text-on-surface">Cancel</button>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

      {/* Assignment Editor Modal */}
      <AnimatePresence>
        {editingAssignment && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setEditingAssignment(null)}
               className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 30 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 30 }}
               className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-10 overflow-hidden border border-white/20"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-black tracking-tight mb-2">Edit Colors</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline bg-surface-container w-fit px-3 py-1 rounded-full">{editingAssignment.dateStr}</p>
                </div>
                <button onClick={() => setEditingAssignment(null)} className="h-12 w-12 rounded-2xl bg-surface-container hover:bg-black hover:text-white flex items-center justify-center transition-all group">
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-90">close</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant mb-6 block text-center">Select Label Color</label>
                  <div className="flex flex-wrap justify-center gap-4">
                    {['#000000', '#2D5BFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'].map(color => (
                      <button 
                        key={color}
                        onClick={() => {
                          setAssignments(prev => {
                            const dayAssignments = prev[editingAssignment.dateStr] || [];
                            return {
                              ...prev,
                              [editingAssignment.dateStr]: dayAssignments.map(a => 
                                a.id === editingAssignment.assignment.id ? { ...a, color } : a
                              )
                            };
                          });
                          setEditingAssignment(null);
                        }}
                        className={`w-14 h-14 rounded-full transition-all hover:scale-110 flex items-center justify-center border-4 border-white shadow-[0_8px_16px_rgba(0,0,0,0.1)] active:scale-95`}
                        style={{ backgroundColor: color }}
                      >
                        {editingAssignment.assignment.color === color && <span className="material-symbols-outlined text-white text-[24px] drop-shadow-md">check</span>}
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        setAssignments(prev => {
                          const dayAssignments = prev[editingAssignment.dateStr] || [];
                          return {
                            ...prev,
                            [editingAssignment.dateStr]: dayAssignments.map(a => 
                              a.id === editingAssignment.assignment.id ? { ...a, color: undefined } : a
                            )
                          };
                        });
                        setEditingAssignment(null);
                      }}
                      className={`w-14 h-14 rounded-full flex flex-col items-center justify-center bg-surface-container text-[8px] font-black uppercase border-4 border-white shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:scale-110 active:scale-95 transition-all outline-dashed outline-1 outline-offset-2 outline-outline-variant/50`}
                    >
                      <span className="material-symbols-outlined text-[16px] mb-0.5">format_color_reset</span>
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
