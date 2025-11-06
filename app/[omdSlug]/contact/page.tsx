'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ContactPage() {
  const params = useParams();
  const omdSlug = params.omdSlug as string;
  
  const [formData, setFormData] = useState({
    nume: '',
    email: '',
    mesaj: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          omdSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'A apărut o eroare. Vă rugăm încercați din nou.');
      }

      setSuccess(true);
      setFormData({ nume: '', email: '', mesaj: '' });
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare. Vă rugăm încercați din nou.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Mulțumim!</h1>
          <p className="mb-6 text-gray-600">
            Mesajul tău a fost trimis cu succes. Echipa noastră îți va răspunde în cel mai scurt timp posibil.
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
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Formular de Contact</h1>
            <p className="text-gray-600">
              Ai întrebări sau ai nevoie de asistență? Completează formularul de mai jos și îți vom răspunde cât mai curând.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-600 text-gray-900">{error}</div>
            )}

            <div>
              <label htmlFor="nume" className="mb-2 block text-sm font-medium text-gray-700">
                Nume complet *
              </label>
              <input
                type="text"
                id="nume"
                required
                value={formData.nume}
                onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Introdu numele tău complet"
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="adresa.ta@email.com"
              />
            </div>

            <div>
              <label htmlFor="mesaj" className="mb-2 block text-sm font-medium text-gray-700">
                Mesaj *
              </label>
              <textarea
                id="mesaj"
                rows={6}
                required
                value={formData.mesaj}
                onChange={(e) => setFormData({ ...formData, mesaj: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Descrie întrebarea sau problema ta în detaliu..."
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
                disabled={loading || !formData.nume || !formData.email || !formData.mesaj}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Se trimite...' : 'Trimite Mesajul'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

