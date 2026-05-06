import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useMode } from '../contexts/ModeContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Giving() {
  const { t } = useLanguage();
  const { mode } = useMode();
  
  // Member State
  const [amount, setAmount] = useState('50');
  const [customAmount, setCustomAmount] = useState('');
  const [copiedField, setCopiedField] = useState('');

  // Manager State
  const [bsb, setBsb] = useState('062-123');
  const [accNo, setAccNo] = useState('1029 3847');
  const [applePayEnabled, setApplePayEnabled] = useState(true);
  const [googlePayEnabled, setGooglePayEnabled] = useState(true);

  const amounts = ['20', '50', '100', '200'];

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const MemberView = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-8 shadow-xl shadow-primary/5"
    >
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container/30 text-secondary border border-secondary/10">
          <span className="material-symbols-outlined text-3xl filled">favorite</span>
        </div>
        <h1 className="font-headline-md text-on-surface">{t('giveTithes')}</h1>
        <p className="mt-2 font-body-md text-on-surface-variant">"{t('giveDesc')}" - 2 Cor 9:7</p>
      </div>

      <div className="mb-8 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {amounts.map(amt => (
            <button
              key={amt}
              onClick={() => { setAmount(amt); setCustomAmount(''); }}
              className={`rounded-xl py-3 font-button text-lg transition-all ${
                amount === amt
                  ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                  : 'border-2 border-surface-container bg-surface text-on-surface hover:border-primary/50'
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>

        <div className="relative mt-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 font-body-lg text-outline">$</span>
          <input
            type="number"
            placeholder={t('customAmount')}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setAmount('');
            }}
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-8 pr-4 font-body-lg text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-3">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 font-button text-white transition-opacity hover:opacity-90">
           <span className="material-symbols-outlined">payments</span>
           {t('payApple')}
        </button>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant bg-white py-3.5 font-button text-black transition-colors hover:bg-stone-50">
           <span className="material-symbols-outlined">g_mobiledata</span>
           {t('payGoogle')}
        </button>
      </div>

      <div className="relative mb-6 flex items-center">
        <div className="flex-grow border-t border-outline-variant/40"></div>
        <span className="mx-4 flex-shrink-0 font-label-sm text-outline">{t('manualBank')}</span>
        <div className="flex-grow border-t border-outline-variant/40"></div>
      </div>

      <div className="rounded-xl border border-surface-container-highest bg-surface-container-low p-5">
         <div className="flex items-center justify-between mb-3">
           <span className="font-label-sm text-outline">{t('accountName')}</span>
           <span className="font-body-md font-medium text-on-surface">Grace Community Inc</span>
         </div>
         
         <div className="flex items-center justify-between mb-3">
           <span className="font-label-sm text-outline">{t('bsb')}</span>
           <div className="flex items-center gap-2">
             <span className="font-body-md font-medium text-on-surface">{bsb}</span>
             <button 
               onClick={() => copyToClipboard(bsb, 'bsb')}
               className="flex h-6 w-6 items-center justify-center rounded bg-surface border border-outline-variant/50 text-outline hover:text-primary hover:border-primary/50 transition-colors"
               title="Copy BSB"
             >
               <span className="material-symbols-outlined text-[14px]">
                 {copiedField === 'bsb' ? 'check' : 'content_copy'}
               </span>
             </button>
           </div>
         </div>
         
         <div className="flex items-center justify-between">
           <span className="font-label-sm text-outline">{t('giveAccountNumber')}</span>
           <div className="flex items-center gap-2">
             <span className="font-body-md font-medium text-on-surface">{accNo}</span>
             <button 
               onClick={() => copyToClipboard(accNo.replace(/\s/g, ''), 'account')}
               className="flex h-6 w-6 items-center justify-center rounded bg-surface border border-outline-variant/50 text-outline hover:text-primary hover:border-primary/50 transition-colors"
               title="Copy Account Number"
             >
               <span className="material-symbols-outlined text-[14px]">
                 {copiedField === 'account' ? 'check' : 'content_copy'}
               </span>
             </button>
           </div>
         </div>
      </div>
    </motion.div>
  );

  const ManagerView = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex max-w-[1400px] w-full flex-col gap-8 p-6 md:p-12 items-center"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
         <div className="rounded-[48px] border border-outline-variant/30 bg-white p-10 shadow-2xl shadow-black/5">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">account_balance</span>
               </div>
               <div>
                  <h3 className="font-serif text-xl font-black text-on-surface">{t('configGateways')}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline">Banking & Infrastructure</p>
               </div>
            </div>

            <div className="space-y-6">
               <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-4">{t('bsbLabel')}</label>
                  <input 
                    type="text" 
                    value={bsb} 
                    onChange={e => setBsb(e.target.value)}
                    className="w-full rounded-2xl border-2 border-transparent bg-surface-container-low py-4 px-6 font-bold outline-none focus:border-primary/30 focus:bg-white transition-all shadow-inner"
                  />
               </div>
               <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-4">{t('accNoLabel')}</label>
                  <input 
                    type="text" 
                    value={accNo} 
                    onChange={e => setAccNo(e.target.value)}
                    className="w-full rounded-2xl border-2 border-transparent bg-surface-container-low py-4 px-6 font-bold outline-none focus:border-primary/30 focus:bg-white transition-all shadow-inner"
                  />
               </div>
            </div>
         </div>

         <div className="rounded-[48px] border border-outline-variant/30 bg-white p-10 shadow-2xl shadow-black/5">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">tap_and_play</span>
               </div>
               <div>
                  <h3 className="font-serif text-xl font-black text-on-surface">{t('mobilePayments')}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline">Fast-Check Configuration</p>
               </div>
            </div>

            <div className="space-y-4">
               {[
                 { name: 'Apple Pay', enabled: applePayEnabled, setter: setApplePayEnabled, icon: 'payments' },
                 { name: 'Google Pay', enabled: googlePayEnabled, setter: setGooglePayEnabled, icon: 'g_mobiledata' }
               ].map(pay => (
                 <div key={pay.name} className="flex items-center justify-between p-6 rounded-3xl bg-surface-container-low/50 border border-outline-variant/10 group/toggle">
                    <div className="flex items-center gap-4">
                       <span className="material-symbols-outlined text-outline group-hover/toggle:text-primary transition-colors">{pay.icon}</span>
                       <span className="text-sm font-black text-on-surface uppercase tracking-widest">{pay.name}</span>
                    </div>
                    <button 
                      onClick={() => pay.setter(!pay.enabled)}
                      className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner ${pay.enabled ? 'bg-primary' : 'bg-outline-variant'}`}
                    >
                      <div className={`absolute top-1.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${pay.enabled ? 'right-1.5' : 'left-1.5'}`}></div>
                    </button>
                 </div>
               ))}
               <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mt-2">
                  <p className="text-[10px] font-medium text-primary text-center italic">Changes are saved automatically to the cloud</p>
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full bg-surface py-12 flex justify-center">
      <AnimatePresence mode="wait">
        {mode === 'Manager' ? (
          <React.Fragment key="manager">
            {ManagerView()}
          </React.Fragment>
        ) : (
          <React.Fragment key="member">
            {MemberView()}
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}
