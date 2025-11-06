'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function RateDestinationPage() {
  const params = useParams();
  const omdSlug = params.omdSlug as string;
  
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError('Te rugăm să selectezi o evaluare.');
      return;
    }

    if (!name || !email) {
      setError('Te rugăm să completezi numele și email-ul.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/feedback/destination-rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          omdSlug,
          rating,
          comment: comment.trim() || null,
          name: name.trim(),
          email: email.trim(),
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
            href={`/${omdSlug}`}
            className="inline-block rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:from-blue-700 hover:to-indigo-700"
          >
            Înapoi la pagina principală
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
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Evaluează Destinația</h1>
            <p className="text-gray-600">
              Ne-ar ajuta mult să știm cum ți-a plăcut experiența ta. Spune-ne ce ai gândit!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-600 text-gray-900">{error}</div>
            )}

            <div>
              <label className="mb-3 block text-lg font-semibold text-gray-900">
                Cum evaluezi destinația? *
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
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                Nume *
              </label>
              <input
                type="text"
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Introdu numele tău"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="adresa.ta@email.com"
              />
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex gap-4">
              <Link
                href={`/${omdSlug}`}
                className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Anulează
              </Link>
              <button
                type="submit"
                disabled={loading || !rating || !name || !email}
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

