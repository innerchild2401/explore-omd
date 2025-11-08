'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface OctorateConnectionProps {
  hotelId: string;
  businessId: string;
  onConnected?: () => void;
}

export default function OctorateConnection({ hotelId, businessId, onConnected }: OctorateConnectionProps) {
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState<string>('');
  const [error, setError] = useState<string>('');
  const supabase = useMemo(() => createClient(), []);

  const checkConnection = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('octorate_hotel_connections')
        .select('*')
        .eq('hotel_id', hotelId)
        .eq('is_active', true)
        .eq('is_connected', true)
        .single();

      if (data) {
        setConnection(data);
      }
    } catch (error) {
      // No connection found
    }
  }, [hotelId, supabase]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');

    try {
      // Get authorization URL
      const response = await fetch(`/api/octorate/oauth/authorize?hotel_id=${hotelId}`);
      const { authUrl } = await response.json();

      if (!authUrl) {
        throw new Error('Failed to get authorization URL');
      }

      // Redirect to Octorate OAuth
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate connection');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Octorate? This will stop syncing data.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/octorate/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setConnection(null);
      onConnected?.();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (connection) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <h3 className="text-lg font-semibold text-green-900">Connected to Octorate</h3>
            </div>
            <p className="mt-1 text-sm text-green-700">
              Accommodation ID: {connection.octorate_accommodation_id}
            </p>
            <p className="mt-1 text-xs text-green-600">
              Last sync: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
        {error && (
          <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Connect Octorate Account</h3>
          <p className="mt-1 text-sm text-gray-600">
            Connect your Octorate PMS to sync inventory, availability, and rates automatically.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            When connected, your hotel data will be synced from Octorate and displayed read-only on this platform.
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : 'Connect Octorate'}
        </button>
      </div>
      {error && (
        <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}

