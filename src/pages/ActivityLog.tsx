import React, { useState } from 'react';
import { useMode } from '../contexts/ModeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function ActivityLog() {
  const { mode } = useMode();
  const { t } = useLanguage();
  const [loadingMore, setLoadingMore] = useState(false);

  // In a real app, this would be fetched from a backend and filtered by user
  const [activities, setActivities] = useState([
    { id: 1, user: 'Sarah Jenkins', role: 'Staff', action: t('uploadedPpt') || 'Uploaded Media', target: '"10,000 Reasons"', type: 'Resource', time: '10 ' + (t('minsAgo') || 'mins ago') },
    { id: 2, user: 'Mark Thompson', role: 'Staff', action: t('declinedRequest') || 'Declined Request', target: 'Oct 29th', type: 'Roster', time: '1 ' + (t('hourAgo') || 'hour ago'), note: t('outOfTown') || 'Out of town' },
    { id: 3, user: 'Ps. Roland', role: 'Manager', action: t('updatedHistory') || 'Updated Church Info', target: 'About Page', type: 'System', time: '3 ' + (t('hoursAgo') || 'hours ago') },
    { id: 4, user: 'David Chen', role: 'Manager', action: t('addedRelationship') || 'Added Network Link', target: 'Mika -> Emily', type: 'Member', time: '5 ' + (t('hoursAgo') || 'hours ago') },
    { id: 5, user: 'Sarah Michaels', role: 'Manager', action: 'Added Member Profile', target: 'John Doe', type: 'Member', time: 'Yesterday' },
    { id: 6, user: 'David Chen', role: 'Manager', action: 'Modified Roster', target: 'May 3rd Service', type: 'Roster', time: 'Yesterday' },
  ]);

  const [filter, setFilter] = useState('All');

  const filteredActivities = filter === 'All' 
    ? activities 
    : activities.filter(a => a.type === filter);

  if (mode === 'Member') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <p className="text-on-surface-variant font-medium">You do not have permission to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-surface-container-lowest animate-in fade-in duration-500">
      <div className="mx-auto w-full max-w-5xl p-6 md:p-10 space-y-8">
        
        {/* Header */}
        <div className="flex items-end justify-between border-b border-outline-variant/30 pb-6">
          <div>
            <h1 className="mb-2 font-display-lg text-4xl text-on-surface">Activity Log</h1>
            <p className="font-body-lg text-outline">Track all system changes made by Managers and Staff</p>
          </div>
          
          <div className="flex bg-surface-container rounded-2xl p-1 shadow-sm border border-outline-variant/20">
            {['All', 'Member', 'Roster', 'Resource', 'System'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === filterOption
                    ? 'bg-primary text-white shadow-md scale-105'
                    : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {filterOption}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-1 gap-4">
          {filteredActivities.map((activity) => (
            <div key={activity.id} className="flex gap-6 p-6 rounded-[32px] border border-outline-variant/10 bg-white shadow-sm hover:border-primary/20 transition-all hover:shadow-md group">
              
              <div className={`mt-1 h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-black/5 ${
                activity.type === 'Resource' ? 'bg-[#ffb4ab] text-[black]' :
                activity.type === 'Roster' ? 'bg-[#9acbfa] text-[black]' :
                activity.type === 'Member' ? 'bg-[#c3ecd4] text-[black]' : 
                'bg-black text-white'
              }`}>
                <span className="material-symbols-outlined text-2xl">
                    {activity.type === 'Resource' ? 'library_music' :
                     activity.type === 'Roster' ? 'calendar_month' :
                     activity.type === 'Member' ? 'group' : 'settings'}
                </span>
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-lg font-bold text-on-surface truncate">{activity.user}</p>
                  <span className="px-2 py-0.5 rounded border border-outline-variant text-[9px] font-black uppercase tracking-widest text-outline">{activity.role}</span>
                  <div className="h-1 w-1 bg-outline-variant rounded-full"></div>
                  <p className="text-xs font-medium text-outline whitespace-nowrap">{activity.time}</p>
                </div>
                <p className="text-sm text-on-surface-variant font-medium">
                  {activity.action} <span className="text-primary font-bold px-1.5 py-0.5 bg-primary/5 rounded-md ml-1">{activity.target}</span>
                </p>
                {activity.note && (
                  <div className="mt-3 bg-surface-container-low border border-outline-variant/20 p-3 rounded-xl">
                    <p className="font-serif italic text-sm text-on-surface-variant text-opacity-80">"{activity.note}"</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-outline">
            <span className="material-symbols-outlined text-5xl mb-4 opacity-50">history</span>
            <p className="font-bold">No activity found for this filter.</p>
          </div>
        )}

      </div>
    </div>
  );
}
