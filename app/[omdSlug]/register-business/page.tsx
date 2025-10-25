'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  params: {
    omdSlug: string;
  };
}

export default function RegisterBusinessPage({ params }: PageProps) {
  const { omdSlug } = params;
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // User is logged in, redirect to business registration
      router.push(`/business/register?omd=${omdSlug}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white px-8 py-10 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Register Your Business</h1>
            <p className="text-gray-600">Join {omdSlug} destination platform</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 font-semibold text-blue-900">📋 Registration Process</h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Create your account with email & password</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Confirm your email address</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Login and complete business registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">4.</span>
                  <span>Wait for OMD admin approval</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">5.</span>
                  <span>Start managing your business!</span>
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <Link
                href="/admin/signup"
                className="block w-full rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Create Account
              </Link>

              <div className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/admin/login" className="font-medium text-blue-600 hover:underline">
                  Login here
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> After creating your account and confirming your email, you&apos;ll be able to register your business details and submit for approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
