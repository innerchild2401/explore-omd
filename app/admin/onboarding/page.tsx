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

    // Check if user already has an OMD
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('omd_id')
      .eq('id', user.id)
      .single();

    if (profile?.omd_id) {
      // User already has an OMD, redirect to admin
      router.push('/admin');
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
      
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Check if slug already exists
      const { data: existingOMD } = await supabase
        .from('omds')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingOMD) {
        setError('This destination name is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // Create the OMD
      const { data: newOMD, error: omdError } = await supabase
        .from('omds')
        .insert({
          name: destinationName,
          slug: slug,
          theme: {},
          colors: { primary: '#0066CC', secondary: '#FFD700' },
          settings: {},
        })
        .select()
        .single();

      if (omdError) {
        setError('Failed to create destination: ' + omdError.message);
        setLoading(false);
        return;
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          role: 'omd_admin',
          omd_id: newOMD.id,
          profile: { name: user.email?.split('@')[0] || 'Admin' },
        });

      if (profileError) {
        setError('Failed to create profile: ' + profileError.message);
        setLoading(false);
        return;
      }

      // Create default sections for the new OMD
      await createDefaultSections(newOMD.id);

      // Success! Redirect to admin
      router.push('/admin');
    } catch (err: any) {
      setError('An error occurred: ' + err.message);
      setLoading(false);
    }
  };

  const createDefaultSections = async (omdId: string) => {
    const defaultSections = [
      {
        omd_id: omdId,
        type: 'hero',
        content: {
          title: `Welcome to ${destinationName}`,
          subtitle: 'Discover amazing places and experiences',
          cta: 'Explore Now',
        },
        is_visible: true,
        order_index: 0,
      },
      {
        omd_id: omdId,
        type: 'stays',
        content: {
          title: 'Where to Stay',
          subtitle: 'Find the perfect accommodation for your visit',
        },
        is_visible: true,
        order_index: 1,
      },
      {
        omd_id: omdId,
        type: 'restaurants',
        content: {
          title: 'Where to Eat',
          subtitle: 'Experience local cuisine and fine dining',
        },
        is_visible: true,
        order_index: 2,
      },
      {
        omd_id: omdId,
        type: 'experiences',
        content: {
          title: 'Things to Do',
          subtitle: 'Unforgettable experiences await',
        },
        is_visible: true,
        order_index: 3,
      },
      {
        omd_id: omdId,
        type: 'footer',
        content: {
          copyright: `© ${new Date().getFullYear()} ${destinationName}. All rights reserved.`,
          links: [],
        },
        is_visible: true,
        order_index: 4,
      },
    ];

    await supabase.from('sections').insert(defaultSections);
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white px-8 py-10 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-3xl">🗺️</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold">Create Your Destination</h1>
            <p className="text-gray-600">
              Let&apos;s set up your destination management platform
            </p>
          </div>

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
                id="destinationName"
                type="text"
                value={destinationName}
                onChange={(e) => handleDestinationNameChange(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Constanta Tourism, Visit Brasov"
              />
              <p className="mt-1 text-xs text-gray-500">
                This is the name visitors will see
              </p>
            </div>

            <div>
              <label
                htmlFor="slug"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                URL Slug
              </label>
              <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-4 py-2">
                <span className="text-gray-500">yoursite.com/</span>
                <span className="font-medium text-gray-900">{slug || 'your-destination'}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Auto-generated from destination name
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !destinationName}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Creating...' : 'Create Destination'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

