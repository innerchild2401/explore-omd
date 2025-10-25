'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils';

export default function AdminOnboarding() {
  const [destinationName, setDestinationName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/admin/login');
      return;
    }

    // Check if user already has a profile with an OMD
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, omd_id')
      .eq('id', user.id)
      .single();

    // If profile exists and has an OMD, redirect based on role
    if (profile?.omd_id) {
      if (profile.role === 'business_owner') {
        router.push('/business/dashboard');
      } else if (['super_admin', 'omd_admin'].includes(profile.role)) {
        router.push('/admin');
      }
      return;
    }

    setCheckingAuth(false);
  };

  const handleDestinationNameChange = (value: string) => {
    setDestinationName(value);
    setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the OMD
      const { data: newOMD, error: omdError } = await supabase
        .from('omds')
        .insert({
          name: destinationName,
          slug: slug,
        })
        .select()
        .single();

      if (omdError) {
        setError('Failed to create destination: ' + omdError.message);
        setLoading(false);
        return;
      }

      // Update user profile (profile is auto-created by trigger on signup)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          role: 'omd_admin',
          omd_id: newOMD.id,
          profile: { name: user.email?.split('@')[0] || 'Admin' },
        })
        .eq('id', user.id);

      if (profileError) {
        setError('Failed to create profile: ' + profileError.message);
        setLoading(false);
        return;
      }

      // Initialize default sections for the new OMD
      const defaultSections = [
        { type: 'hero', content: { title: `Welcome to ${destinationName}`, subtitle: 'Discover amazing experiences' }, order_index: 0 },
        { type: 'explore', content: { title: `Explore ${destinationName}`, subtitle: 'Find the best places to stay, eat, and experience' }, order_index: 1 },
        { type: 'stays', content: { title: 'Where to Stay', subtitle: 'Find your perfect accommodation' }, order_index: 2 },
        { type: 'restaurants', content: { title: 'Where to Eat', subtitle: 'Discover local cuisine' }, order_index: 3 },
        { type: 'experiences', content: { title: 'Things to Do', subtitle: 'Explore activities and attractions' }, order_index: 4 },
        { type: 'footer', content: { links: [] }, order_index: 5 },
      ];

      for (const section of defaultSections) {
        await supabase.from('sections').insert({
          omd_id: newOMD.id,
          ...section,
        });
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white px-8 py-10 shadow-lg">
          <h1 className="mb-6 text-center text-3xl font-bold text-gray-900">Create New OMD</h1>
          <p className="mb-6 text-center text-gray-600">
            Set up a new destination management organization
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="destinationName"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Destination Name
              </label>
              <input
                type="text"
                id="destinationName"
                value={destinationName}
                onChange={(e) => handleDestinationNameChange(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Constanta Tourism, Visit Brasov"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be the name of your destination organization
              </p>
            </div>

            <div>
              <label
                htmlFor="slug"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                URL Slug
              </label>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., constanta"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your destination will be accessible at: yoursite.com/
                <strong>{slug || 'slug'}</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Creating...' : 'Create Destination'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
