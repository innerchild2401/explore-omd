'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RestaurantBasicInfo from './RestaurantBasicInfo';
import MenuManager from './MenuManager';
import BusinessSwitcher from './BusinessSwitcher';
import AddBusinessModal from './AddBusinessModal';
import BusinessLabelsManager from './BusinessLabelsManager';

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  contact: any;
  location: any;
  omd_id: string;
  is_published: boolean;
}

interface Restaurant {
  id: string;
  business_id: string;
  cuisine_type: string;
  price_range: string;
  seating_capacity: number;
  accepts_reservations: boolean;
  delivery_available: boolean;
  takeaway_available: boolean;
  opening_hours: any;
}

interface OMD {
  id: string;
  name: string;
  slug: string;
}

interface RestaurantDashboardProps {
  business: Business;
  restaurant: Restaurant;
  omd: OMD;
}

export default function RestaurantDashboard({
  business,
  restaurant,
  omd,
}: RestaurantDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const [isPublished, setIsPublished] = useState<boolean>(business.is_published ?? false);
  const [publishLoading, setPublishLoading] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${omd.slug}/business/login`);
  };

  const handleTogglePublish = async () => {
    setPublishLoading(true);
    try {
      const nextValue = !isPublished;
      const updates: Record<string, any> = {
        is_published: nextValue,
      };

      if (!nextValue) {
        updates.featured_order = null;
      }

      const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', business.id);

      if (error) throw error;

      setIsPublished(nextValue);
      router.refresh();
      showToast('success', nextValue ? 'Your page is now live!' : 'Your page is hidden from visitors.');
    } catch (error) {
      console.error('Failed to update publish status:', error);
      showToast('error', 'Could not update visibility. Please try again.');
    } finally {
      setPublishLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'basic-info', label: 'Basic Info', icon: 'ℹ️' },
    { id: 'menu', label: 'Menu', icon: '🍽️' },
    { id: 'labels', label: 'Labels', icon: '🏷️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="space-y-4">
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
                  Manage your restaurant information and menu
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {isPublished ? (
                  <Link
                    href={`/${omd.slug}/restaurants/${business.slug}`}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    View Public Page
                  </Link>
                ) : (
                  <span className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-500">
                    Public page hidden
                  </span>
                )}
                <button
                  onClick={handleSignOut}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  Sign Out
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <BusinessSwitcher currentBusinessSlug={business.slug} omdSlug={omd.slug} />
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <span>+</span>
                Add New Business
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Visibility</p>
                  <p className="text-sm text-gray-600">
                    {isPublished
                      ? 'Your restaurant is live on the destination website.'
                      : 'Keep the page hidden while you complete your details.'}
                  </p>
                </div>
                <button
                  onClick={handleTogglePublish}
                  disabled={publishLoading}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    isPublished
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {publishLoading
                    ? 'Updating...'
                    : isPublished
                    ? 'Hide from Visitors'
                    : 'Publish Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AddBusinessModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        omdSlug={omd.slug}
        omdId={omd.id}
      />

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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Cuisine Type</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {restaurant.cuisine_type || 'Not set'}
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
                    <p className="text-sm font-medium text-gray-600">Price Range</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {restaurant.price_range || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Seating Capacity</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {restaurant.seating_capacity || 'Not set'}
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
                    <p className="font-medium text-gray-900">Update Restaurant Info</p>
                    <p className="text-sm text-gray-600">Edit basic details and contact info</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('menu')}
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-2xl mr-3">🍽️</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Manage Menu</p>
                    <p className="text-sm text-gray-600">Add, edit, or remove menu items</p>
                  </div>
                </button>

                <div className="flex items-center p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <span className="text-2xl mr-3">📞</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Reservations</p>
                    <p className="text-sm text-gray-600">Call {business.contact?.phone || 'your phone'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Restaurant Info Preview */}
            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Information</h3>
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
                  <p className="text-sm font-medium text-gray-600">Reservations</p>
                  <p className="text-gray-900">
                    {restaurant.accepts_reservations ? 'Yes - Call to book' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'basic-info' && (
          <RestaurantBasicInfo
            business={business}
            restaurant={restaurant}
            onUpdate={() => {
              showToast('success', 'Restaurant information updated successfully!');
              router.refresh();
            }}
          />
        )}

        {activeTab === 'menu' && (
          <MenuManager
            restaurantId={restaurant.id}
            businessId={business.id}
            onUpdate={() => {
              showToast('success', 'Menu updated successfully!');
            }}
          />
        )}

        {activeTab === 'labels' && (
          <BusinessLabelsManager businessId={business.id} businessType="restaurant" />
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
