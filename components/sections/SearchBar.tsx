'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { TemplateName } from '@/lib/omdTemplates';

interface SearchBarProps {
  omdSlug: string;
  template: TemplateName;
}

export default function SearchBar({ omdSlug, template }: SearchBarProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'stay' | 'eat' | 'do'>('stay');
  
  // Hotel dates
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  
  // Restaurant reservation
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  
  // Experience date
  const [experienceDate, setExperienceDate] = useState('');

  const tabs = [
    { 
      id: 'stay' as const, 
      label: 'Stay', 
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: 'eat' as const, 
      label: 'Eat', 
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      id: 'do' as const, 
      label: 'Do', 
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      )
    },
  ];

  const handleStaySearch = () => {
    console.log('SearchBar - handleStaySearch called with:', { checkIn, checkOut, omdSlug });
    const params = new URLSearchParams();
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    const query = params.toString();
    const url = query ? `/${omdSlug}/hotels?${query}` : `/${omdSlug}/hotels`;
    console.log('SearchBar - navigating to:', url);
    router.push(url);
  };

  const handleRestaurantSearch = () => {
    const params = new URLSearchParams();
    if (reservationDate) params.set('date', reservationDate);
    if (reservationTime) params.set('time', reservationTime);
    const query = params.toString();
    router.push(query ? `/${omdSlug}/restaurants?${query}` : `/${omdSlug}/restaurants`);
  };

  const handleExperienceSearch = () => {
    const params = new URLSearchParams();
    if (experienceDate) params.set('date', experienceDate);
    const query = params.toString();
    router.push(query ? `/${omdSlug}/experiences?${query}` : `/${omdSlug}/experiences`);
  };

  const sectionBackground =
    template === 'story'
      ? 'bg-black/80 backdrop-blur text-white border-b border-white/10'
      : template === 'map'
      ? 'bg-white/95 backdrop-blur border-b border-slate-200'
      : 'bg-white shadow-md';

  const tabActiveClass =
    template === 'story'
      ? 'text-white'
      : template === 'map'
      ? 'text-blue-700'
      : 'text-blue-600';

  const tabInactiveClass =
    template === 'story' ? 'text-white/70 hover:text-white' : 'text-gray-700 hover:text-gray-900';

  const underlineColor =
    template === 'story' ? 'bg-white' : template === 'map' ? 'bg-blue-600' : 'bg-blue-600';

  const buttonClasses =
    template === 'story'
      ? 'rounded-lg bg-white/90 px-8 py-3 font-semibold text-black transition-colors hover:bg-white'
      : 'rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700';

  const inputClasses =
    template === 'story'
      ? 'w-full rounded-lg border-2 border-white/30 bg-white/10 px-4 py-3 text-white placeholder-white/60 outline-none transition-all focus:border-white'
      : 'w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-gray-900 outline-none transition-all focus:border-blue-600';

  return (
    <section className={`relative z-30 ${sectionBackground} lg:sticky lg:top-0`}>
      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Tabs */}
        <div className="mb-4 flex justify-center space-x-2 sm:space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center justify-center gap-2 px-4 py-2.5 text-base font-semibold transition-colors sm:px-6 sm:text-lg ${
                activeTab === tab.id ? tabActiveClass : tabInactiveClass
              }`}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 h-1 ${underlineColor}`}
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Hotels Search */}
        {activeTab === 'stay' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <div className="flex-1">
              <label
                className={`mb-1 block text-sm font-medium ${
                  template === 'story' ? 'text-white/80' : 'text-gray-600'
                }`}
              >
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={inputClasses}
              />
            </div>
            <div className="flex-1">
              <label
                className={`mb-1 block text-sm font-medium ${
                  template === 'story' ? 'text-white/80' : 'text-gray-600'
                }`}
              >
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().split('T')[0]}
                className={inputClasses}
              />
            </div>
            <button
              onClick={handleStaySearch}
              className={`mt-auto ${buttonClasses}`}
            >
              Explore Stays
            </button>
          </motion.div>
        )}

        {/* Restaurants Search */}
        {activeTab === 'eat' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <button
              onClick={() => router.push(`/${omdSlug}/restaurants`)}
              className={buttonClasses}
            >
              See All Restaurants
            </button>
          </motion.div>
        )}

        {/* Experiences Search */}
        {activeTab === 'do' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <div className="flex-1">
              <label
                className={`mb-1 block text-sm font-medium ${
                  template === 'story' ? 'text-white/80' : 'text-gray-600'
                }`}
              >
                Date
              </label>
              <input
                type="date"
                value={experienceDate}
                onChange={(e) => setExperienceDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={inputClasses}
              />
            </div>
            <button
              onClick={handleExperienceSearch}
              className={`mt-auto md:ml-auto ${buttonClasses}`}
            >
              Explore Experiences
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

