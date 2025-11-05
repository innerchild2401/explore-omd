'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Check if there's a token in the URL (from Supabase email verification)
    const tokenHash = searchParams.get('token_hash');
    const token = searchParams.get('token');

    // Supabase typically redirects after verification via middleware
    // Show a brief loading state, then success
    if (tokenHash || token) {
      // Small delay to show loading state
      setTimeout(() => {
        setVerifying(false);
      }, 500);
    } else {
      // No token, assume already verified by Supabase middleware
      setVerifying(false);
    }
  }, [searchParams]);

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md px-4">
          <div className="rounded-2xl bg-white px-8 py-12 shadow-xl text-center">
            <div className="mb-6">
              <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-700">Se verifică...</h2>
            <p className="mt-2 text-sm text-gray-500">Vă rugăm să așteptați</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white px-8 py-12 shadow-2xl text-center">
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-in fade-in zoom-in duration-500">
            <svg
              className="h-12 w-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            Verificare Reușită!
          </h1>
          
          <p className="mb-8 text-lg text-gray-700 leading-relaxed">
            Verificare reușită, acum te poți loga cu emailul și parola setate de tine în pagina de login.
          </p>

          {/* Info Box */}
          <div className="mb-8 rounded-xl bg-blue-50 border border-blue-100 p-5 text-left">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">
                  Următorul pas
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  Folosește emailul și parola pe care le-ai setat la înregistrare pentru a te conecta în contul tău.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Link
            href="/admin/login"
            className="inline-block w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:scale-105 transform duration-200"
          >
            Mergi la Pagina de Login
          </Link>

          {/* Additional Help */}
          <p className="mt-6 text-sm text-gray-500">
            Ai nevoie de ajutor?{' '}
            <a
              href="mailto:support@example.com"
              className="font-medium text-blue-600 hover:underline"
            >
              Contactează-ne
            </a>
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Contul tău este acum securizat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="w-full max-w-md px-4">
            <div className="rounded-2xl bg-white px-8 py-12 shadow-xl text-center">
              <div className="mb-6">
                <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-700">Se încarcă...</h2>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

