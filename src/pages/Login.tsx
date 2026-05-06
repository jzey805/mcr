import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { onboardingService } from '../services/onboardingService';

export default function Login() {
  const navigate = useNavigate();
  const { session, loginAsGuest, loginAsSuperAdmin } = useAuth();
  const { t, setLanguage, language } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [isRegisteringChurch, setIsRegisteringChurch] = useState(false);
  const [showPendingScreen, setShowPendingScreen] = useState(false);
  const [onboardingSuccess, setOnboardingSuccess] = useState<{ churchCode: string; staffCode: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [churchCode, setChurchCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetupOption, setShowSetupOption] = useState(false);
  const [showChurchContactModal, setShowChurchContactModal] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/app/dashboard');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setError(language === 'zh' ? '请先查看您的邮箱并点击确认链接，然后才能登入。' : 'Please check your email and click the confirmation link before signing in.');
          } else {
            throw error;
          }
          return;
        }
        // Navigation will be handled by the useEffect above
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: name,
              church_code: churchCode || 'DEFAULT',
            }
          }
        });

        if (error) throw error;
        setShowPendingScreen(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/app/dashboard',
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    try {
      const result = await onboardingService.registerChurch({
        churchName: formData.get('churchName') as string,
        location: formData.get('location') as string,
        leaderName: formData.get('leaderName') as string,
        leaderRole: formData.get('leaderRole') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      });
      
      setOnboardingSuccess({
        churchCode: result.churchCode,
        staffCode: result.staffCode
      });
    } catch (err: any) {
      setError(err.message || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  if (onboardingSuccess) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center bg-surface p-4">
        <div className="relative z-10 w-full max-w-md rounded-[40px] bg-white p-12 shadow-2xl text-center">
          <div className="mb-6 flex justify-center text-success">
            <span className="material-symbols-outlined text-[64px]">check_circle</span>
          </div>
          <h2 className="mb-2 font-serif text-2xl font-bold text-black">Church Instance Ready</h2>
          <p className="mb-8 text-sm text-outline">Check your email for confirmation.</p>
          
          <div className="mb-8 rounded-2xl bg-black/5 p-6 text-left space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-outline">Public Church Code (For Members)</p>
              <p className="text-xl font-mono font-bold text-black">{onboardingSuccess.churchCode}</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setOnboardingSuccess(null);
              setIsLogin(true);
              setIsRegisteringChurch(false);
            }}
            className="w-full rounded-2xl bg-black py-4 font-black uppercase tracking-widest text-white hover:bg-primary transition-all"
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1548625361-ecacfa310659?q=80&w=2000&auto=format&fit=crop')",
            filter: "blur(4px)",
            transform: "scale(1.05)"
          }}
        ></div>
        <div className="absolute inset-0 bg-background/80 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-surface/20"></div>
      </div>

      {/* Main Content Canvas */}
      <div className="relative z-10 w-full max-w-[440px] px-6">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl shadow-primary/10">
          
          {showPendingScreen ? (
            <div className="flex flex-col items-center p-10 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[40px]">how_to_reg</span>
              </div>
              <h2 className="mb-3 font-serif text-2xl font-bold text-on-surface">{t('requestSubmitted')}</h2>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-8">
                {t('requestSubmittedDesc')}
              </p>
              <button
                onClick={() => {
                  setShowPendingScreen(false);
                  setIsLogin(true);
                }}
                className="w-full rounded-lg bg-primary py-3 font-button text-sm text-on-primary hover:bg-primary/90 transition-colors"
               >
                 {t('backToLogin')}
               </button>
            </div>
          ) : (
            <>
              {/* Card Header */}
              <div className="flex flex-col items-center px-8 pb-4 pt-10 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container shadow-sm border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[32px] text-primary filled">
                    church
                  </span>
                </div>
                <h1 className="mb-2 font-serif text-3xl font-bold tracking-tight text-on-surface">{t('welcome')}</h1>
                <p className="font-body text-sm text-on-surface-variant">{isLogin ? t('signInDesc') : t('applyDesc')}</p>
              </div>

              {/* Card Body / Form */}
              <div className="px-8 pb-8 pt-4">
                <div className="flex gap-4 mb-4 border-b border-outline-variant/30">
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setIsRegisteringChurch(false);
                    }}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isLogin ? 'text-primary border-b-2 border-primary' : 'text-outline/50 hover:text-outline'}`}
                  >
                    {t('signin')}
                  </button>
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setIsRegisteringChurch(false); // Default to member signup
                    }}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${!isLogin ? 'text-primary border-b-2 border-primary' : 'text-outline/50 hover:text-outline'}`}
                  >
                    {t('signup')}
                  </button>
                </div>

                {!isLogin && (
                  <div className="flex bg-surface-container rounded-xl p-1 mb-6">
                    <button
                      onClick={() => setIsRegisteringChurch(false)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isRegisteringChurch ? 'bg-white shadow-sm text-black' : 'text-outline hover:text-on-surface'}`}
                    >
                      {language === 'zh' ? '加入教会' : 'Join Church'}
                    </button>
                    {showSetupOption && (
                      <button
                        onClick={() => setIsRegisteringChurch(true)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isRegisteringChurch ? 'bg-white shadow-sm text-black' : 'text-outline hover:text-on-surface'}`}
                      >
                        {language === 'zh' ? '开通系统' : 'Setup System'}
                      </button>
                    )}
                  </div>
                )}

                <form className="flex flex-col gap-4" onSubmit={isRegisteringChurch ? handleOnboarding : handleSubmit}>
                  {error && (
                    <div className="rounded-lg bg-error/10 p-3 text-sm text-error font-medium">
                      {error}
                    </div>
                  )}

                  {isRegisteringChurch ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="ml-1 font-label-sm text-on-surface-variant">Church Name</label>
                        <input required name="churchName" className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 px-4 text-sm" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="ml-1 font-label-sm text-on-surface-variant">Church Phone</label>
                        <input required name="phone" type="tel" className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 px-4 text-sm" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="ml-1 font-label-sm text-on-surface-variant">Location Address</label>
                        <input required name="location" className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 px-4 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="ml-1 font-label-sm text-on-surface-variant">Lead Name</label>
                          <input required name="leaderName" className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 px-4 text-sm" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="ml-1 font-label-sm text-on-surface-variant">Role</label>
                          <select name="leaderRole" className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 px-4 text-sm">
                            <option>Pastor</option>
                            <option>Staff</option>
                            <option>Elder</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="ml-1 font-label-sm text-on-surface-variant">Admin Email</label>
                        <input required name="email" type="email" className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 px-4 text-sm" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="ml-1 font-label-sm text-on-surface-variant">Admin Password</label>
                        <input required name="password" type="password" className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 px-4 text-sm" />
                      </div>
                    </>
                  ) : (
                    <>
                      {!isLogin && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="churchCode" className="ml-1 font-label-sm text-on-surface-variant flex items-center justify-between">
                              {t('churchCode')}
                              <button 
                                type="button"
                                onClick={() => {
                                  setShowChurchContactModal(true);
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm ring-1 ring-primary/20"
                                title="Need Help?"
                              >
                                <span className="material-symbols-outlined text-[14px]">help</span>
                              </button>
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                                <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                              </span>
                              <input
                                type="text"
                                id="churchCode"
                                required
                                placeholder={t('egChurchCode')}
                                value={churchCode}
                                onChange={(e) => setChurchCode(e.target.value)}
                                className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 pl-10 pr-4 font-body text-sm text-on-surface outline-none transition-all duration-200 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="name" className="ml-1 font-label-sm text-on-surface-variant">{t('fullName')}</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                                <span className="material-symbols-outlined text-[18px]">person</span>
                              </span>
                              <input
                                type="text"
                                id="name"
                                required
                                placeholder={t('egJaneDoe')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 pl-10 pr-4 font-body text-sm text-on-surface outline-none transition-all duration-200 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="ml-1 font-label-sm text-on-surface-variant">{t('email')}</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                            <span className="material-symbols-outlined text-[18px]">mail</span>
                          </span>
                          <input
                            type="email"
                            id="email"
                            required
                            placeholder={t('egEmail')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 pl-10 pr-4 font-body text-sm text-on-surface outline-none transition-all duration-200 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="ml-1 font-label-sm text-on-surface-variant">{t('password')}</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                          </span>
                          <input
                            type="password"
                            id="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-outline-variant/50 bg-surface-container py-3 pl-10 pr-4 font-body text-sm text-on-surface outline-none transition-all duration-200 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 font-button text-sm text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <span>{loading ? 'Processing...' : (isRegisteringChurch ? 'Initialize System' : (isLogin ? t('signIn') : t('submitRequest')))}</span>
                    {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                  </button>

                  {isLogin && (
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-3 rounded-lg border border-outline-variant bg-white py-3 font-button text-sm text-on-surface shadow-sm transition-all hover:bg-surface-container"
                      >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        <span>{language === 'zh' ? '使用 Google 账号登录' : 'Sign in with Google'}</span>
                      </button>
                      <p className="px-2 text-center text-[10px] font-medium text-outline/60 leading-tight">
                        {language === 'zh' 
                          ? 'Google 登录后默认为“成员”身份。之后可由管理员升级权限。' 
                          : 'Google sign-ins are joined as "Member" by default. Roles can be upgraded by admins later.'}
                      </p>

                      <div className="relative flex items-center justify-center py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-outline-variant/30"></div>
                        </div>
                        <span className="relative bg-surface-container-lowest px-3 text-[10px] font-bold uppercase tracking-widest text-outline">or</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => loginAsGuest()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 py-3 font-button text-sm text-primary transition-all hover:bg-primary/10"
                      >
                        <span className="material-symbols-outlined text-[20px]">account_circle</span>
                        <span>{language === 'zh' ? '使用测试账号登录 (Demo Login)' : 'Demo Access (Test Login)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => loginAsSuperAdmin()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/20 bg-black/5 py-3 font-button text-sm text-black transition-all hover:bg-black/10"
                      >
                        <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                        <span>{language === 'zh' ? '超级管理员演示 (Super Admin Demo)' : 'Super Admin Demo'}</span>
                      </button>
                    </div>
                  )}
                </form>

                <div className="mt-8 relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant/30"></div>
                  </div>
                  <div className="relative bg-surface-container-lowest px-4 text-xs font-medium text-outline">
                    {t('moreOptions')}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="w-full rounded-lg border border-outline-variant/50 py-2.5 text-sm font-button text-on-surface hover:bg-surface-container-lowest transition-colors"
                  >
                    {isLogin ? t('signUpMember') : t('alreadyAccount')}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-1.5 text-outline">
            <span className="material-symbols-outlined text-[16px]">language</span>
            <select 
              className="bg-transparent border-none text-xs font-label-sm outline-none cursor-pointer text-on-surface-variant hover:text-on-surface"
              value={localStorage.getItem('app-language') || 'system'}
              onChange={(e) => setLanguage(e.target.value as any)}
            >
              <option value="system">{t('systemLanguage')}</option>
              <option value="en">English</option>
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-outline">
            <span className="material-symbols-outlined text-[16px]">shield</span>
            <span className="font-label-sm text-xs">{t('secureEnv')}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showChurchContactModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-left">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChurchContactModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-2xl font-black">{language === 'zh' ? '找不到您的教会？' : 'Church Not Found?'}</h3>
                <button onClick={() => setShowChurchContactModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-outline">close</span>
                </button>
              </div>

              <p className="text-sm text-outline mb-8 leading-relaxed">
                {language === 'zh' 
                  ? '您的教会目前不在我们的系统。如果您是管理员，并希望开通系统，请填写以下信息。我们随后会与您联系。' 
                  : 'Your church isn\'t in our system yet. If you are an admin and wish to set up a system, please fill in the info below. We will reach out to you.'}
              </p>

              <form onSubmit={(e) => {
                e.preventDefault();
                setContactSuccess(true);
                setShowSetupOption(true);
                setTimeout(() => {
                  setContactSuccess(false);
                  setShowChurchContactModal(false);
                }, 3000);
              }} className="space-y-4">
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{language === 'zh' ? '教会名称' : 'Church Name'}</label>
                    <input required type="text" className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low py-3 px-4 text-sm focus:border-primary outline-none transition-all" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{language === 'zh' ? '电话号码' : 'Phone Number'}</label>
                    <input required type="tel" className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low py-3 px-4 text-sm focus:border-primary outline-none transition-all" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{language === 'zh' ? '邮件' : 'Email'}</label>
                    <input required type="email" className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low py-3 px-4 text-sm focus:border-primary outline-none transition-all" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{language === 'zh' ? '地址' : 'Address'}</label>
                    <input required type="text" className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low py-3 px-4 text-sm focus:border-primary outline-none transition-all" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{language === 'zh' ? '教会链接 / YouTube 频道' : 'Church Link / YouTube Channel'}</label>
                    <input type="url" placeholder="https://..." className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low py-3 px-4 text-sm focus:border-primary outline-none transition-all" />
                 </div>
                 
                 {contactSuccess ? (
                   <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-4 text-center text-success font-bold text-sm bg-success/10 rounded-xl"
                   >
                      {language === 'zh' ? '已收录！我们将尽快联系您。' : 'Someone will contact you.'}
                   </motion.div>
                 ) : (
                   <button type="submit" className="w-full mt-4 rounded-2xl bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl active:scale-95">
                      {language === 'zh' ? '提交申请' : 'SUBMIT APPLICATION'}
                   </button>
                 )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
