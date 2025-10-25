'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Business {
  id: string;
  name: string;
  type: string;
  description: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  owner_id: string;
  user_profiles: {
    email: string;
    metadata: {
      contact_name?: string;
      phone?: string;
    };
  };
}

interface BusinessApprovalListProps {
  pendingBusinesses: Business[];
  approvedBusinesses: Business[];
  omdId: string;
}

export default function BusinessApprovalList({
  pendingBusinesses,
  approvedBusinesses,
  omdId,
}: BusinessApprovalListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (businessId: string, ownerId: string) => {
    setLoading(businessId);
    
    try {
      // Approve the business
      const { error: businessError } = await supabase
        .from('businesses')
        .update({ is_active: true })
        .eq('id', businessId);

      if (businessError) throw businessError;

      // Update user profile status
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          metadata: { status: 'approved' }
        })
        .eq('id', ownerId);

      if (profileError) throw profileError;

      router.refresh();
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to approve business');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (businessId: string, ownerId: string) => {
    if (!confirm('Are you sure you want to reject this business? This action cannot be undone.')) {
      return;
    }

    setLoading(businessId);
    
    try {
      // Delete the business
      const { error: businessError } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);

      if (businessError) throw businessError;

      // Update user profile status
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          metadata: { status: 'rejected' }
        })
        .eq('id', ownerId);

      if (profileError) throw profileError;

      router.refresh();
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Failed to reject business');
    } finally {
      setLoading(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hotel':
        return '🏨';
      case 'restaurant':
        return '🍽️';
      case 'experience':
        return '🎟️';
      default:
        return '📍';
    }
  };

  const getTypeName = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-8">
      {/* Pending Businesses */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Pending Approvals ({pendingBusinesses.length})
        </h2>
        
        {pendingBusinesses.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No pending business applications</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingBusinesses.map((business) => (
              <div
                key={business.id}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 shadow"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center">
                    <span className="mr-2 text-3xl">{getTypeIcon(business.type)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{business.name}</h3>
                      <span className="text-sm text-gray-600">{getTypeName(business.type)}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-800">
                    Pending
                  </span>
                </div>

                <div className="mb-4 space-y-2 text-sm">
                  <p className="text-gray-700">
                    <strong>Description:</strong> {business.description}
                  </p>
                  <p className="text-gray-700">
                    <strong>Contact:</strong> {business.user_profiles.metadata?.contact_name || 'N/A'}
                  </p>
                  <p className="text-gray-700">
                    <strong>Email:</strong> {business.email}
                  </p>
                  <p className="text-gray-700">
                    <strong>Phone:</strong> {business.phone}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Applied: {new Date(business.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(business.id, business.owner_id)}
                    disabled={loading === business.id}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-green-300"
                  >
                    {loading === business.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(business.id, business.owner_id)}
                    disabled={loading === business.id}
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

      {/* Approved Businesses */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Approved Businesses ({approvedBusinesses.length})
        </h2>
        
        {approvedBusinesses.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No approved businesses yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {approvedBusinesses.map((business) => (
              <div
                key={business.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center">
                    <span className="mr-2 text-2xl">{getTypeIcon(business.type)}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{business.name}</h3>
                      <span className="text-xs text-gray-600">{getTypeName(business.type)}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                    Active
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <p><strong>Email:</strong> {business.email}</p>
                  <p><strong>Phone:</strong> {business.phone}</p>
                  <p className="text-gray-400">
                    Approved: {new Date(business.created_at).toLocaleDateString()}
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

