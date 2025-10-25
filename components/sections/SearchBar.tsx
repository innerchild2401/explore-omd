'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface SearchBarProps {
  omdSlug: string;
}

export default function SearchBar({ omdSlug }: SearchBarProps) {
  const [activeTab, setActiveTab] = useState<'stay' | 'eat' | 'do'>('stay');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'stay' as const, label: 'Stay', icon: '🏨' },
    { id: 'eat' as const, label: 'Eat', icon: '🍽️' },
    { id: 'do' as const, label: 'Do', icon: '🎟️' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching:', activeTab, searchQuery);
  };

  return (
    <section className="sticky top-0 z-40 bg-white shadow-md">
      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Tabs */}
        <div className="mb-4 flex justify-center space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-6 py-2 text-lg font-medium transition-colors"
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search for ${activeTab === 'stay' ? 'hotels' : activeTab === 'eat' ? 'restaurants' : 'experiences'}...`}
            className="w-full rounded-full border-2 border-gray-200 px-6 py-4 pr-14 text-lg outline-none transition-all focus:border-blue-600"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
}

