'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface BookingIssue {
  id: string;
  reservation_id: string;
  hotel_id: string;
  issue_type: string;
  description: string;
  status: string;
  guest_email: string;
  contact_preference?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  reservations?: {
    confirmation_number: string;
    check_in_date: string;
    check_out_date: string;
    hotels?: {
      businesses?: {
        name: string;
      };
    };
  };
}

interface BookingIssuesListProps {
  issues: BookingIssue[];
}

export default function BookingIssuesList({ issues }: BookingIssuesListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const handleStatusUpdate = async (issueId: string, newStatus: string, notes?: string) => {
    setLoading(issueId);
    
    try {
      const updateData: any = { status: newStatus };
      if (notes !== undefined) {
        updateData.admin_notes = notes;
      }
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('booking_issue_reports')
        .update(updateData)
        .eq('id', issueId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Error updating issue:', error);
      alert('Failed to update issue status');
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'payment':
        return 'Probleme cu plata';
      case 'confirmation':
        return 'Probleme cu confirmarea';
      case 'communication':
        return 'Probleme de comunicare';
      case 'other':
        return 'Altele';
      default:
        return type;
    }
  };

  const filteredIssues = selectedStatus === 'all' 
    ? issues 
    : issues.filter(issue => issue.status === selectedStatus);

  const statusCounts = {
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    closed: issues.filter(i => i.status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      {/* Status Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 font-semibold transition-colors ${
              selectedStatus === status
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} ({count})
          </button>
        ))}
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-600">Nu există rapoarte de probleme</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      {getIssueTypeLabel(issue.issue_type)}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeColor(issue.status)}`}>
                      {issue.status.charAt(0).toUpperCase() + issue.status.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600">{issue.guest_email}</p>
                  {issue.reservations && (
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Rezervare: {issue.reservations.confirmation_number}</p>
                      {issue.reservations.hotels?.businesses && (
                        <p>Hotel: {issue.reservations.hotels.businesses.name}</p>
                      )}
                    </div>
                  )}
                  {issue.contact_preference && (
                    <p className="text-sm text-gray-500">
                      Preferință contact: {issue.contact_preference === 'email' ? 'Email' : 'Telefon'}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {new Date(issue.created_at).toLocaleString('ro-RO')}
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <p className="text-gray-700">{issue.description}</p>
              </div>

              {issue.admin_notes && (
                <div className="mb-4 rounded-lg bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">Note admin:</p>
                  <p className="text-blue-700">{issue.admin_notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {issue.status !== 'in_progress' && (
                  <button
                    onClick={() => handleStatusUpdate(issue.id, 'in_progress')}
                    disabled={loading === issue.id}
                    className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-700 disabled:bg-yellow-300"
                  >
                    Marchează ca în procesare
                  </button>
                )}
                {issue.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate(issue.id, 'resolved')}
                    disabled={loading === issue.id}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-green-300"
                  >
                    Marchează ca rezolvat
                  </button>
                )}
                {issue.status !== 'closed' && (
                  <button
                    onClick={() => handleStatusUpdate(issue.id, 'closed')}
                    disabled={loading === issue.id}
                    className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:bg-gray-300"
                  >
                    Închide
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

