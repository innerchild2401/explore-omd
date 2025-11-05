'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ReservationStaffRatingContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  const token = searchParams.get('token');

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reservationData, setReservationData] = useState<any>(null);

  useEffect(() => {
    // Validate we have required params
    if (!reservationId || !token) {
      setError('Link invalid sau expirat. Te rugăm să folosești linkul din email.');
      return;
    }

    // Fetch reservation data to verify token
    fetch(`/api/feedback/verify-token?reservationId=${reservationId}&token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setReservationData(data.reservation);
        } else {
          setError('Link invalid sau expirat. Te rugăm să folosești linkul din email.');
        }
      })
      .catch(err => {
        setError('Eroare la verificarea linkului. Te rugăm să încerci din nou.');
      });
  }, [reservationId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError('Te rugăm să selectezi o evaluare.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/feedback/reservation-staff-rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          token,
          rating,
          comment: comment.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Eroare la trimiterea evaluării');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Eroare la trimiterea evaluării. Te rugăm să încerci din nou.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !reservationData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Link Invalid</h1>
          <p className="mb-6 text-gray-600">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Mergi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Mulțumim!</h1>
          <p className="mb-6 text-gray-600">
            Evaluarea ta a fost trimisă cu succes. Feedback-ul tău este valoros pentru noi și ne ajută să îmbunătățim serviciile.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:from-blue-700 hover:to-indigo-700"
          >
            Mergi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Evaluare Serviciu de Rezervări</h1>
            <p className="text-gray-600">
              Ne-ar ajuta mult să știm cum a fost experiența ta cu procesul de rezervare.
            </p>
          </div>

          {reservationData && (
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                <strong>Rezervare:</strong> {reservationData.confirmation_number}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Hotel:</strong> {reservationData.hotel_name}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
            )}

            <div>
              <label className="mb-3 block text-lg font-semibold text-gray-900">
                Cum evaluezi serviciul de rezervări? *
              </label>
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`h-16 w-16 rounded-full text-4xl transition-transform hover:scale-110 ${
                      rating && rating >= star
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-sm text-gray-500">
                {rating === 1 && 'Foarte slab'}
                {rating === 2 && 'Slab'}
                {rating === 3 && 'Mediu'}
                {rating === 4 && 'Bun'}
                {rating === 5 && 'Excelent'}
              </p>
            </div>

            <div>
              <label htmlFor="comment" className="mb-2 block text-sm font-medium text-gray-700">
                Comentarii (opțional)
              </label>
              <textarea
                id="comment"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Spune-ne mai multe despre experiența ta..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex gap-4">
              <Link
                href="/"
                className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Anulează
              </Link>
              <button
                type="submit"
                disabled={loading || !rating}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Se trimite...' : 'Trimite Evaluarea'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ReservationStaffRatingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Se încarcă...</p>
          </div>
        </div>
      }
    >
      <ReservationStaffRatingContent />
    </Suspense>
  );
}

