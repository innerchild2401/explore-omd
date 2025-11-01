'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface OMD {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    profile?: {
      name?: string;
    };
  };
}

interface OMDPendingApprovalsProps {
  pendingOMDs: OMD[];
  activeOMDs: OMD[];
}

export default function OMDPendingApprovals({ pendingOMDs, activeOMDs }: OMDPendingApprovalsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (omdId: string) => {
    setLoading(omdId);
    
    try {
      const { error } = await supabase
        .from('omds')
        .update({ status: 'active' })
        .eq('id', omdId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to approve OMD');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (omdId: string) => {
    if (!confirm('Are you sure you want to reject this OMD? This action cannot be undone.')) {
      return;
    }

    setLoading(omdId);
    
    try {
      // Delete the OMD and all related data
      const { error } = await supabase
        .from('omds')
        .delete()
        .eq('id', omdId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Failed to reject OMD');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Pending OMDs */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Pending OMD Approvals ({pendingOMDs.length})
        </h2>
        
        {pendingOMDs.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No pending OMD applications</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingOMDs.map((omd) => (
              <div
                key={omd.id}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 shadow"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center">
                    <span className="mr-3 text-4xl">🏛️</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{omd.name}</h3>
                      <span className="text-sm text-gray-600">/{omd.slug}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-800">
                    Pending
                  </span>
                </div>

                <div className="mb-4 space-y-2 text-sm">
                  <p className="text-gray-700">
                    <strong>Created:</strong> {new Date(omd.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-700">
                    <strong>Admin:</strong> {omd.user_profiles?.profile?.name || 'N/A'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(omd.id)}
                    disabled={loading === omd.id}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-green-300"
                  >
                    {loading === omd.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(omd.id)}
                    disabled={loading === omd.id}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-red-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active OMDs */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Active OMDs ({activeOMDs.length})
        </h2>
        
        {activeOMDs.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No active OMDs yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeOMDs.map((omd) => (
              <div
                key={omd.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center">
                    <span className="mr-2 text-2xl">🏛️</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{omd.name}</h3>
                      <span className="text-xs text-gray-600">/{omd.slug}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                    Active
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <p className="text-gray-400">
                    Created: {new Date(omd.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

