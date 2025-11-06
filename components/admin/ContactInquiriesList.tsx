'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  notes?: string;
  omd_id?: string;
  omds?: {
    name: string;
    slug: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface ContactInquiriesListProps {
  inquiries: Inquiry[];
}

export default function ContactInquiriesList({ inquiries }: ContactInquiriesListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const handleStatusUpdate = async (inquiryId: string, newStatus: string, notes?: string) => {
    setLoading(inquiryId);
    
    try {
      const updateData: any = { status: newStatus };
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('contact_inquiries')
        .update(updateData)
        .eq('id', inquiryId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Error updating inquiry:', error);
      alert('Failed to update inquiry status');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (inquiryId: string) => {
    if (!confirm('Are you sure you want to delete this inquiry?')) {
      return;
    }

    setLoading(inquiryId);
    
    try {
      const { error } = await supabase
        .from('contact_inquiries')
        .delete()
        .eq('id', inquiryId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      alert('Failed to delete inquiry');
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInquiries = selectedStatus === 'all' 
    ? inquiries 
    : inquiries.filter(inq => inq.status === selectedStatus);

  const statusCounts = {
    all: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    contacted: inquiries.filter(i => i.status === 'contacted').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length,
    archived: inquiries.filter(i => i.status === 'archived').length,
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
            {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
          </button>
        ))}
      </div>

      {/* Inquiries List */}
      {filteredInquiries.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No inquiries found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{inquiry.name}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeColor(inquiry.status)}`}>
                      {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600">{inquiry.email}</p>
                  {inquiry.omds && (
                    <p className="text-sm text-blue-600 font-medium">
                      OMD: {inquiry.omds.name}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {new Date(inquiry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <p className="text-gray-700">{inquiry.message}</p>
              </div>

              {inquiry.notes && (
                <div className="mb-4 rounded-lg bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">Notes:</p>
                  <p className="text-blue-700">{inquiry.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {inquiry.status !== 'contacted' && (
                  <button
                    onClick={() => handleStatusUpdate(inquiry.id, 'contacted')}
                    disabled={loading === inquiry.id}
                    className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-700 disabled:bg-yellow-300"
                  >
                    Mark as Contacted
                  </button>
                )}
                {inquiry.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate(inquiry.id, 'resolved')}
                    disabled={loading === inquiry.id}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-green-300"
                  >
                    Mark as Resolved
                  </button>
                )}
                {inquiry.status !== 'archived' && inquiry.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate(inquiry.id, 'archived')}
                    disabled={loading === inquiry.id}
                    className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:bg-gray-300"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => handleDelete(inquiry.id)}
                  disabled={loading === inquiry.id}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

