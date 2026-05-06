import React, { useState } from 'react';
import { useMode } from '../contexts/ModeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Profile() {
  const { mode } = useMode();
  const { t, setLanguage } = useLanguage();
  
  const [formData, setFormData] = useState({
    firstName: 'Sarah',
    lastName: 'Michaels',
    email: 'sarah.michaels@example.com',
    phone: '(555) 123-4567',
    dob: '1995-08-15',
    age: '29',
    address: '123 Grace Ave, Sydney, NSW 2000',
    hometown: '台灣台北', // Default per request
    language: localStorage.getItem('app-language') || 'system',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setLanguage(formData.language as any);
    setTimeout(() => {
      setSaving(false);
      // alert('Profile updated successfully');
    }, 1000);
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 font-headline-md text-on-surface">My Profile</h2>
          <p className="font-label-sm text-on-surface-variant">Manage your personal details and app preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Column: Avatar & Quick Info */}
        <div className="flex flex-col gap-6">
          <div className="glass-card shadow-sm p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop"
                alt="Profile"
                className="h-32 w-32 rounded-full border-4 border-surface object-cover shadow-md"
              />
              <button 
                className="absolute bottom-0 right-0 p-2 bg-primary text-on-primary rounded-full shadow-lg hover:bg-primary-container transition-colors"
                title="Update Photo"
              >
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              </button>
            </div>
            <h3 className="font-headline-md text-xl text-on-surface">{formData.firstName} {formData.lastName}</h3>
            <p className="mt-1 font-label-sm uppercase tracking-widest text-outline">{mode}</p>
            
            <div className="mt-6 flex flex-col gap-2 w-full">
              <div className="text-xs text-on-surface-variant flex items-center justify-between">
                <span>{t('joinedLabel')}</span>
                <span className="font-medium text-on-surface">Oct 2021</span>
              </div>
              <div className="text-xs text-on-surface-variant flex items-center justify-between">
                <span>{t('statusLabel')}</span>
                <span className="font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">{t('activeStatus')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Forms */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="glass-card shadow-sm p-6">
            <h3 className="mb-6 font-serif text-lg font-bold border-b border-outline-variant/30 pb-4">{t('personalInfo')}</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-outline uppercase">{t('firstNameProfile')}</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-4 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-outline uppercase">{t('lastNameProfile')}</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-4 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-outline uppercase">{t('emailAddress')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2 text-outline-variant">mail</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-10 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-outline uppercase">{t('phoneNumber')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2 text-outline-variant">phone</span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-10 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-outline uppercase">{t('dateOfBirth')}</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-4 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-outline uppercase">{t('age')}</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-4 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-outline uppercase">{t('address')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2 text-outline-variant">home</span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-10 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-outline uppercase">{t('hometown')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2 text-outline-variant">location_on</span>
                  <input
                    type="text"
                    value={formData.hometown}
                    onChange={e => setFormData({ ...formData, hometown: e.target.value })}
                    placeholder={t('egHometown')}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-10 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-outline uppercase">{t('preferredLanguage')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2 text-outline-variant">language</span>
                  <select
                    value={formData.language}
                    onChange={e => setFormData({ ...formData, language: e.target.value })}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-10 pr-4 font-body-md text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all appearance-none"
                  >
                    <option value="system">System Language - 系統語言</option>
                    <option value="en">English</option>
                    <option value="zh-CN">Chinese (Simplified) - 简体中文</option>
                    <option value="zh-TW">Chinese (Traditional) - 繁體中文</option>
                    <option value="ja">Japanese - 日本語</option>
                    <option value="ko">Korean - 한국어</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-button text-on-primary shadow-md hover:bg-primary/90 transition-colors disabled:opacity-70 text-xs"
                >
                  {saving ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">save</span>
                  )}
                  {saving ? t('preparing') : t('saveChanges')}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card shadow-sm p-6">
            <h3 className="mb-6 font-serif text-lg font-bold border-b border-outline-variant/30 pb-4">Subscription & Billing</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div>
                    <p className="font-body-md font-bold text-on-surface">Church Management Pro</p>
                    <p className="text-sm text-on-surface-variant">$2.00 / active member / month</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-label-sm uppercase tracking-widest text-outline">Current Total</p>
                  <p className="font-bold text-on-surface">$240.00 / mo</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body-md text-sm font-semibold text-on-surface">Payment Method</p>
                  <p className="font-body-md text-xs text-on-surface-variant">Visa ending in 4242</p>
                </div>
                <button className="rounded border border-outline-variant bg-surface-container px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface transition-colors hover:bg-surface-container-high">
                  Update
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card shadow-sm p-6">
            <h3 className="mb-6 font-serif text-lg font-bold border-b border-outline-variant/30 pb-4 text-error">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body-md text-sm font-semibold text-on-surface">Delete Account</p>
                <p className="font-body-md text-xs text-on-surface-variant">Permanently remove your account and data.</p>
              </div>
              <button className="rounded border border-error/50 bg-error/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-error transition-colors hover:bg-error hover:text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
