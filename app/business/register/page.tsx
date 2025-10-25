'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BusinessRegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [omds, setOmds] = useState<any[]>([]);

  // Form fields
  const [selectedOmdId, setSelectedOmdId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<'hotel' | 'restaurant' | 'experience'>('hotel');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/admin/login?message=Please login first');
        return;
      }

      setUser(user);

      // Check if user already has a business
      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('id, status')
        .eq('owner_id', user.id)
        .single();

      if (existingBusiness) {
        // Already has a business, redirect to appropriate dashboard
        router.push('/business/dashboard');
        return;
      }

      // Fetch all available OMDs
      const { data: omdsList } = await supabase
        .from('omds')
        .select('id, name, slug')
        .order('name');

      setOmds(omdsList || []);

      // Check if OMD is specified in URL params
      const params = new URLSearchParams(window.location.search);
      const omdParam = params.get('omd');
      
      if (omdParam && omdsList) {
        const matchedOmd = omdsList.find((o: any) => o.slug === omdParam);
        if (matchedOmd) {
          setSelectedOmdId(matchedOmd.id);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error checking user:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!user) throw new Error('Not authenticated');
      if (!selectedOmdId) throw new Error('Please select a destination');

      // Create business (RLS will allow because user is authenticated and owner_id matches auth.uid())
      const { error: businessError } = await supabase
        .from('businesses')
        .insert({
          omd_id: selectedOmdId,
          type: businessType,
          name: businessName,
          slug: businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: '', // Optional, can be added later in dashboard
          owner_id: user.id,
          contact: {
            name: contactName,
            phone: phone,
            email: user.email,
          },
          status: 'pending',
        });

      if (businessError) throw businessError;

      // Update user profile to business_owner
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          role: 'business_owner',
          omd_id: selectedOmdId,
          profile: {
            status: 'pending',
            contact_name: contactName,
            phone: phone,
          },
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register business. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-gray-200 bg-white px-8 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-4 text-3xl font-bold text-gray-900">Application Submitted!</h1>
            <p className="mb-6 text-gray-700">
              Thank you for registering your business. Your application is now pending approval by the OMD administrator.
            </p>
            <p className="mb-6 text-gray-700">
              We&apos;ll notify you once your business has been approved. You can then access your dashboard to manage your business.
            </p>
            <Link
              href="/business/dashboard"
              className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Go to Dashboard
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 py-12">
      <div className="w-full max-w-2xl">
        <div className="rounded-lg border border-gray-200 bg-white px-8 py-10 shadow-lg">
          <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">Register Your Business</h1>
          <p className="mb-8 text-center text-gray-600">
            Complete your business registration to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Destination Selection */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-800">1. Select Destination</h2>
              <div>
                <label htmlFor="omdSelect" className="mb-2 block text-sm font-medium text-gray-700">
                  Destination *
                </label>
                <select
                  id="omdSelect"
                  value={selectedOmdId}
                  onChange={(e) => setSelectedOmdId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a destination...</option>
                  {omds.map((omd) => (
                    <option key={omd.id} value={omd.id}>
                      {omd.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose the destination where your business is located
                </p>
              </div>
            </div>

            {/* Business Information */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-800">2. Business Details</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="businessName" className="mb-2 block text-sm font-medium text-gray-700">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Grand Hotel"
                  />
                </div>
                
                <div>
                  <label htmlFor="businessType" className="mb-2 block text-sm font-medium text-gray-700">
                    Business Category *
                  </label>
                  <select
                    id="businessType"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as any)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="hotel">Hotel / Accommodation</option>
                    <option value="restaurant">Restaurant / Cafe</option>
                    <option value="experience">Experience / Activity</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-800">3. Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-gray-700">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                    placeholder="+40 712 345 678"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Using your account email
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <strong>Error:</strong> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

