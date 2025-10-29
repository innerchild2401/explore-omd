'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ExperienceBasicInfo from './ExperienceBasicInfo';
import TimeSlotManager from './TimeSlotManager';

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  contact: any;
  location: any;
  omd_id: string;
}

interface Experience {
  id: string;
  business_id: string;
  category: string | null;
  duration: string | null;
  difficulty_level: string | null;
  min_participants: number;
  max_participants: number | null;
  price: number | null;
  price_from: number | null;
  currency: string | null;
  includes: any;
  requirements: any;
  meeting_point: any;
  included: string[] | null;
  not_included: string[] | null;
  important_info: string[] | null;
  tags: string[] | null;
  cancellation_policy: string | null;
  instant_confirmation: boolean;
  languages: string[] | null;
  wheelchair_accessible: boolean;
}

interface OMD {
  id: string;
  name: string;
  slug: string;
}

interface ExperienceDashboardProps {
  business: Business;
  experience: Experience;
  omd: OMD;
}

export default function ExperienceDashboard({
  business,
  experience,
  omd,
}: ExperienceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const router = useRouter();

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'basic-info', label: 'Basic Info', icon: 'ℹ️' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link 
                href={`/${omd.slug}`} 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Back to {omd.name}
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {business.name} Dashboard
              </h1>
              <p className="mt-1 text-gray-600">
                Manage your experience information and schedule
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={`/${omd.slug}/experiences/${business.slug}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Public Page
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Category</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {experience.category || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Price From</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {experience.price_from 
                        ? `${experience.currency || 'USD'} ${experience.price_from}`
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">⏱️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Duration</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {experience.duration || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <button
                  onClick={() => setActiveTab('basic-info')}
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-2xl mr-3">ℹ️</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Update Experience Info</p>
                    <p className="text-sm text-gray-600">Edit basic details and pricing</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('schedule')}
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-2xl mr-3">📅</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Manage Schedule</p>
                    <p className="text-sm text-gray-600">Add or edit time slots</p>
                  </div>
                </button>

                <div className="flex items-center p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <span className="text-2xl mr-3">📊</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Analytics</p>
                    <p className="text-sm text-gray-600">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Experience Info Preview */}
            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="text-gray-900">
                    {business.description || 'No description available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact</p>
                  <p className="text-gray-900">
                    {business.contact?.phone || 'No phone number'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Address</p>
                  <p className="text-gray-900">
                    {business.location?.address || 'No address available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Difficulty</p>
                  <p className="text-gray-900">
                    {experience.difficulty_level || 'Not set'}
                  </p>
                </div>
                {experience.included && experience.included.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-600">What's Included</p>
                    <ul className="list-disc list-inside text-gray-900">
                      {experience.included.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'basic-info' && (
          <ExperienceBasicInfo
            business={business}
            experience={experience}
            onUpdate={() => {
              showToast('success', 'Experience information updated successfully!');
              router.refresh();
            }}
          />
        )}

        {activeTab === 'schedule' && (
          <TimeSlotManager
            experienceId={experience.id}
            businessId={business.id}
            onUpdate={() => {
              showToast('success', 'Schedule updated successfully!');
            }}
          />
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
