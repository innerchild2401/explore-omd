'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface OctorateSyncStatusProps {
  hotelId: string;
}

export default function OctorateSyncStatus({ hotelId }: OctorateSyncStatusProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [hotelId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/octorate/sync/status?hotel_id=${hotelId}`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (type: 'inventory' | 'availability' | 'rates') => {
    setSyncing(type);
    try {
      const endpoint = type === 'inventory' ? '/api/octorate/sync/inventory' : 
                       type === 'availability' ? '/api/octorate/sync/availability' : 
                       '/api/octorate/sync/rates';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync ${type}`);
      }

      await fetchStatus();
    } catch (error) {
      console.error(`Sync error (${type}):`, error);
      alert(`Failed to sync ${type}. Please try again.`);
    } finally {
      setSyncing(null);
    }
  };

  if (loading || !status || !status.connected) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Status</h3>
      
      <div className="space-y-4">
        {/* Last Sync Times */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Last Inventory Sync</p>
            <p className="text-sm font-medium text-gray-900">
              {status.lastInventorySyncAt 
                ? new Date(status.lastInventorySyncAt).toLocaleString() 
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Last Availability Sync</p>
            <p className="text-sm font-medium text-gray-900">
              {status.lastSyncAt 
                ? new Date(status.lastSyncAt).toLocaleString() 
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Queue Status</p>
            <p className="text-sm font-medium text-gray-900">
              {status.queueStatus.pending} pending, {status.queueStatus.processing} processing
            </p>
          </div>
        </div>

        {/* Error Status */}
        {status.errorCount > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm font-medium text-red-900">Error Count: {status.errorCount}</p>
            {status.lastError && (
              <p className="text-xs text-red-700 mt-1">{status.lastError}</p>
            )}
          </div>
        )}

        {/* Sync Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSync('inventory')}
            disabled={syncing !== null}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing === 'inventory' ? 'Syncing...' : 'Sync Inventory'}
          </button>
          <button
            onClick={() => handleSync('availability')}
            disabled={syncing !== null}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing === 'availability' ? 'Syncing...' : 'Sync Availability'}
          </button>
          <button
            onClick={() => handleSync('rates')}
            disabled={syncing !== null}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing === 'rates' ? 'Syncing...' : 'Sync Rates'}
          </button>
        </div>

        {/* Recent Webhooks */}
        {status.recentWebhooks && status.recentWebhooks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Recent Webhooks</p>
            <div className="space-y-1">
              {status.recentWebhooks.slice(0, 5).map((webhook: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{webhook.event_type}</span>
                  <span className={webhook.processed ? 'text-green-600' : 'text-yellow-600'}>
                    {webhook.processed ? 'Processed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

