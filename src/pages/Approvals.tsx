import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

import { QRCodeSVG } from 'qrcode.react';

interface PendingRequest {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  role: string;
}

export default function Approvals() {
  const { language } = useLanguage();
  const { profile, church } = useAuth();
  const [allMembers, setAllMembers] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Manager' | 'Staff' | 'Group' | 'Member'>('Pending');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [customCodes, setCustomCodes] = useState({
    code: '',
    staff: '',
    member: ''
  });
  const [showJoinQR, setShowJoinQR] = useState<'Main' | 'Staff' | 'Member' | null>(null);

  useEffect(() => {
    if (church) {
      setCustomCodes({
        code: church.code || '',
        staff: church.staff_join_code || '',
        member: church.member_join_code || ''
      });
    }
  }, [church]);

  const isZh = language.startsWith('zh');
  const t = (key: string) => {
    const translations: any = {
      title: isZh ? '成员管理' : 'Member Management',
      subtitle: isZh ? '管理教会成员及入会申请' : 'Manage church members and membership applications',
      noRequests: isZh ? '没有找到匹配的成员' : 'No matching members found',
      approve: isZh ? '通过并分配角色' : 'Approve & Assign Role',
      update: isZh ? '修改角色' : 'Update Role',
      reject: isZh ? '移除/拒绝' : 'Remove / Reject',
      searchHint: isZh ? '搜索姓名或邮箱...' : 'Search name or email...',
      roleAssign: isZh ? '成员角色' : 'Member Role',
      manager: isZh ? '经理 (Manager)' : 'Manager',
      staff: isZh ? '同工 (Staff)' : 'Staff',
      group: isZh ? '小组 (Group)' : 'Group',
      member: isZh ? '会友 (Member)' : 'Member',
      groupLeader: isZh ? '小组长 (Group Leader)' : 'Group Leader',
      groupMember: isZh ? '小组成员 (Group Member)' : 'Group Member',
      pending: isZh ? '待审核' : 'Pending',
      all: isZh ? '全部' : 'All',
      success: isZh ? '角色已更新' : 'Role updated successfully',
      rejected: isZh ? '已移除' : 'Removed successfully',
      churchCode: isZh ? '入会码管理' : 'Join Codes',
      mainCode: isZh ? '普通教会码' : 'Standard Code',
      staffCode: isZh ? '同工码' : 'Staff Code',
      memberCode: isZh ? '会友码' : 'Member Code',
      copy: isZh ? '复制' : 'Copy',
      close: isZh ? '关闭' : 'Close',
    };
    return translations[key] || key;
  };

  const isFetchingRef = React.useRef(false);

  const fetchData = async () => {
    // Super Admin might not have a church_id in their profile if they switched, 
    // but the 'church' object from AuthContext should be respected.
    const targetChurchId = profile?.church_id || church?.id;
    if (!targetChurchId) {
      if (profile) setIsLoading(false);
      return;
    }
    
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at, role')
        .eq('church_id', targetChurchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllMembers(data || []);
      
      const hasPending = (data || []).some(m => m.role === 'Pending');
      if (hasPending) setActiveTab('Pending');
      else if (activeTab === 'Pending') setActiveTab('All');
      
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (profile?.church_id || church?.id) {
      fetchData();
    }
  }, [profile?.church_id, church?.id]);

  const handleUpdateRole = async (id: string, name: string, role: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', id);

      if (error) throw error;
      
      setAllMembers(prev => prev.map(r => r.id === id ? { ...r, role: role } : r));
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm(isZh ? '确定要移除/拒绝该成员吗？' : 'Are you sure you want to remove/reject this member?')) return;
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAllMembers(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredMembers = allMembers.filter(r => {
    const matchesSearch = (r.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (r.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'All' || 
                       (activeTab === 'Group' ? (r.role === 'Group Leader' || r.role === 'Group Member') : r.role === activeTab);
    return matchesSearch && matchesTab;
  });

  const handleSaveCodes = async () => {
    const targetChurchId = profile?.church_id || church?.id;
    if (!targetChurchId) {
      alert(isZh ? '无法保存：未找到关联的教会ID。' : 'Error: Target church ID missing.');
      return;
    }

    setProcessingId('saving-codes');
    try {
      const { error } = await supabase
        .from('churches')
        .update({ 
          code: customCodes.code.trim().toUpperCase(),
          staff_join_code: customCodes.staff.trim().toUpperCase(),
          member_join_code: customCodes.member.trim().toUpperCase()
        })
        .eq('id', targetChurchId);

      if (error) throw error;
      
      setIsEditingCode(false);
      alert(isZh ? '加入码更新成功！' : 'Join codes updated!');
      window.location.reload();
    } catch (err: any) {
      alert(isZh ? '保存失败: ' + err.message : 'Error saving codes: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const copyCode = () => {
    if (church?.code) {
      navigator.clipboard.writeText(church.code);
      alert(isZh ? '加入码已复制到剪贴板' : 'Join code copied to clipboard');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 opacity-60">
              <span className="material-symbols-outlined text-outline text-lg">church</span>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-outline truncate">{church?.name || (isZh ? '加载中...' : 'Loading...')}</span>
            </div>
            <h1 className="text-4xl font-serif font-black text-on-surface tracking-tight">{t('title')}</h1>
            <p className="text-outline mt-1 font-medium">{t('subtitle')}</p>
          </div>

          <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-[32px] flex flex-col md:flex-row gap-6">
            <div className="flex flex-col md:flex-row gap-6 flex-1">
              {/* Church Key Info */}
              <div className="flex items-center gap-3 pr-6 md:border-r border-amber-200">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined filled text-xl">key</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-800/60 leading-none mb-1">{t('churchCode')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-amber-900 tracking-wider font-mono">{church?.code || '---'}</span>
                  </div>
                </div>
              </div>

              {/* Manager Info Block */}
              <div className="flex items-center gap-3 pr-6 md:border-r border-amber-200">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">manage_accounts</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 leading-none mb-1">{isZh ? '教会管理员' : 'MANAGER'}</p>
                  {(() => {
                    const manager = allMembers.find(m => m.role === 'Manager');
                    return (
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-on-surface truncate max-w-[150px]">
                          {manager?.full_name || (isZh ? '加载中...' : 'Loading...')}
                        </span>
                        <span className="text-[9px] text-outline font-medium opacity-60 truncate max-w-[150px]">
                          {manager?.email || '...'} {manager?.phone && `• ${manager.phone}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 flex-1">
              {[
                { type: 'Main' as const, label: t('mainCode'), code: church?.code, color: 'amber' },
                { type: 'Staff' as const, label: t('staffCode'), code: church?.staff_join_code, color: 'primary' },
                { type: 'Member' as const, label: t('memberCode'), code: church?.member_join_code, color: 'secondary' }
              ].map((item) => (
                <div key={item.type} className="flex flex-col gap-1 min-w-[120px]">
                  <p className="text-[9px] font-black uppercase tracking-tight text-outline/60 ml-1">{item.label}</p>
                  <div className="flex items-center gap-2 bg-white/50 border border-outline-variant/30 rounded-xl px-3 py-1.5 shadow-sm group">
                    <span className={`text-xs font-mono font-black tracking-widest ${item.code ? 'text-on-surface' : 'text-outline/30'}`}>
                      {item.code || '---'}
                    </span>
                    <div className="flex gap-1 ml-auto opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setShowJoinQR(item.type)}
                        className="p-1 hover:bg-surface-container rounded-md text-outline"
                        title={isZh ? '显示二维码' : 'Show QR'}
                      >
                        <span className="material-symbols-outlined text-sm">qr_code_2</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (item.code) {
                            navigator.clipboard.writeText(item.code);
                            alert(t('copy'));
                          }
                        }}
                        className="p-1 hover:bg-surface-container rounded-md text-outline"
                        title={t('copy')}
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setIsEditingCode(true)}
                className="mt-auto mb-1 h-9 px-4 rounded-xl bg-white border border-outline-variant/30 text-[10px] font-black uppercase tracking-widest text-outline hover:text-primary hover:border-primary/30 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                {isZh ? '管理' : 'Manage'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex bg-surface-container p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
            {(['Pending', 'Manager', 'Staff', 'Group', 'Member', 'All'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {tab === 'Pending' ? t('pending') : tab === 'All' ? t('all') : t(tab.toLowerCase())}
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                   activeTab === tab ? 'bg-primary/10 text-primary' : 'bg-outline/10 text-outline'
                }`}>
                  {allMembers.filter(m => {
                    if (tab === 'All') return true;
                    if (tab === 'Group') return m.role === 'Group Leader' || m.role === 'Group Member';
                    return m.role === tab;
                  }).length}
                </span>
              </button>
            ))}
          </div>

          <div className="relative group w-full md:flex-1 md:max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
            <input 
              type="text"
              placeholder={t('searchHint')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container rounded-2xl py-3 pl-12 pr-4 text-sm font-medium border border-transparent focus:border-primary/30 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-low rounded-[40px] p-20 text-center border border-dashed border-outline-variant/30"
        >
          <span className="material-symbols-outlined text-6xl text-outline/20 mb-4 scale-125">group_off</span>
          <h3 className="text-xl font-bold text-outline/40">{t('noRequests')}</h3>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredMembers.map((req) => (
              <RequestCard 
                key={req.id} 
                request={req} 
                t={t} 
                isProcessing={processingId === req.id}
                onUpdateRole={handleUpdateRole}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      {/* Codes Edit Modal */}
      <AnimatePresence>
        {isEditingCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEditingCode(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-10 rounded-[48px] shadow-2xl relative z-10 max-w-lg w-full overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">passkey</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-on-surface font-serif">{isZh ? '管理加入码' : 'Manage Join Codes'}</h3>
                  <p className="text-xs text-outline font-medium">{isZh ? '设置不同角色的快速加入码' : 'Fast join codes for different roles'}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('mainCode')}</label>
                  <p className="text-[10px] text-outline/60 italic ml-1 mb-2">{isZh ? '新成员使用此码加入后需要管理员手动审核。' : 'Members joining with this code require manual approval.'}</p>
                  <input 
                    type="text" 
                    value={customCodes.code}
                    onChange={e => setCustomCodes({...customCodes, code: e.target.value.toUpperCase()})}
                    className="w-full bg-surface-container rounded-2xl py-4 px-6 text-lg font-mono font-black tracking-widest focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-outline/20"
                    placeholder="CHURCH123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">{t('staffCode')}</label>
                    <input 
                      type="text" 
                      value={customCodes.staff}
                      onChange={e => setCustomCodes({...customCodes, staff: e.target.value.toUpperCase()})}
                      className="w-full bg-primary/5 rounded-2xl py-4 px-6 font-mono font-black tracking-widest focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-primary/20"
                      placeholder="STAFF123"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">{t('memberCode')}</label>
                    <input 
                      type="text" 
                      value={customCodes.member}
                      onChange={e => setCustomCodes({...customCodes, member: e.target.value.toUpperCase()})}
                      className="w-full bg-secondary/5 rounded-2xl py-4 px-6 font-mono font-black tracking-widest focus:ring-2 focus:ring-secondary outline-none transition-all placeholder:text-secondary/20"
                      placeholder="MEMBER123"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3 items-start">
                   <span className="material-symbols-outlined text-amber-600 text-lg">info</span>
                   <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                     {isZh 
                       ? '同工码和会友码是极高权限的代码。任何人输入这些码都会直接获得相应的权限，请务必妥善保存并仅分发给受信任的人选。'
                       : 'Staff & Member codes grant direct permissions. Anyone with these codes bypassing approval. Please only share with trusted people.'}
                   </p>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button 
                  onClick={() => setIsEditingCode(false)}
                  className="flex-1 px-8 py-4 rounded-3xl text-sm font-black uppercase tracking-widest text-outline hover:bg-surface-container transition-all"
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>
                <button 
                  onClick={handleSaveCodes}
                  disabled={processingId === 'saving-codes'}
                  className="flex-[2] bg-primary text-on-primary px-8 py-4 rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {processingId === 'saving-codes' ? '...' : (isZh ? '保存设置' : 'Save Codes')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join QR Modal */}
      <AnimatePresence>
        {showJoinQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinQR(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-10 rounded-[48px] shadow-2xl relative z-10 flex flex-col items-center gap-6 max-w-sm w-full"
            >
              <div className="text-center space-y-2">
                <h3 className="font-serif text-2xl font-black text-on-surface">{church?.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-outline">
                  {showJoinQR === 'Main' ? t('mainCode') : showJoinQR === 'Staff' ? t('staffCode') : t('memberCode')}
                </p>
              </div>
              
              <div className={`p-6 rounded-[32px] border-2 ${
                showJoinQR === 'Main' ? 'bg-amber-50 border-amber-100' : 
                showJoinQR === 'Staff' ? 'bg-primary/5 border-primary/10' : 
                'bg-secondary/5 border-secondary/10'
              }`}>
                <QRCodeSVG 
                  value={
                    showJoinQR === 'Main' ? (church?.code || '') : 
                    showJoinQR === 'Staff' ? (church?.staff_join_code || '') : 
                    (church?.member_join_code || '')
                  } 
                  size={220} 
                />
              </div>

              <div className="text-center">
                <p className={`text-3xl font-mono font-black tracking-[0.2em] ${
                  showJoinQR === 'Main' ? 'text-amber-900' : 
                  showJoinQR === 'Staff' ? 'text-primary' : 
                  'text-secondary'
                }`}>
                  {showJoinQR === 'Main' ? (church?.code || '---') : 
                   showJoinQR === 'Staff' ? (church?.staff_join_code || '---') : 
                   (church?.member_join_code || '---')}
                </p>
                <p className="text-outline text-xs mt-4 font-medium px-6">
                  {isZh ? '扫描此码即可快速加入教会' : 'Scan this code to quickly join the church'}
                </p>
              </div>

              <button 
                onClick={() => setShowJoinQR(null)}
                className="w-full bg-on-surface text-surface py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all text-sm"
              >
                {t('close')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RequestCard({ request, t, isProcessing, onUpdateRole, onRemove }: any) {
  const [selectedRole, setSelectedRole] = useState(request.role === 'Pending' ? 'Member' : request.role);
  const isChanged = selectedRole !== request.role;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`bg-white rounded-[32px] p-6 border transition-all flex flex-col gap-6 ${
        request.role === 'Pending' ? 'border-amber-200 shadow-amber-500/5' : 'border-outline-variant/10 shadow-black/[0.03]'
      } shadow-xl hover:shadow-2xl`}
    >
      <div className="flex items-center gap-4">
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-serif font-black text-2xl ${
          request.role === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
        }`}>
          {request.full_name?.charAt(0) || 'U'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-lg text-on-surface truncate leading-tight">{request.full_name || 'Anonymous'}</h4>
            {request.role === 'Pending' && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">{t('pending')}</span>
            )}
          </div>
          <p className="text-xs text-outline font-medium truncate opacity-70">{request.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline/60 ml-1">
          {t('roleAssign')}
        </label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { id: 'Manager', label: t('manager') },
            { id: 'Staff', label: t('staff') },
            { id: 'Group Leader', label: t('groupLeader') },
            { id: 'Group Member', label: t('groupMember') },
            { id: 'Member', label: t('member') }
          ].map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-3 rounded-xl text-xs font-bold text-left px-4 flex items-center justify-between transition-all border ${
                selectedRole === role.id 
                  ? 'bg-primary/5 border-primary/20 text-primary' 
                  : 'bg-surface border-transparent text-outline hover:bg-surface-container'
              }`}
            >
              <span>{role.label}</span>
              {selectedRole === role.id && (
                <span className="material-symbols-outlined text-sm">check_circle</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2 mt-auto">
        <button 
          disabled={isProcessing || !isChanged}
          onClick={() => onUpdateRole(request.id, request.full_name, selectedRole)}
          className={`flex-[2] text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg transition-all disabled:opacity-30 ${
            request.role === 'Pending' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-primary shadow-primary/20'
          } ${isChanged && !isProcessing ? 'hover:scale-[1.02] active:scale-95' : ''}`}
        >
          {isProcessing ? '...' : (request.role === 'Pending' ? t('approve') : t('update'))}
        </button>
        <button 
          disabled={isProcessing}
          onClick={() => onRemove(request.id)}
          className="flex-1 bg-surface-container text-outline text-xs font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-error hover:text-white transition-all disabled:opacity-50"
        >
          {request.role === 'Pending' ? t('reject') : <span className="material-symbols-outlined text-lg">delete</span>}
        </button>
      </div>
    </motion.div>
  );
}
