'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ToastNotificationProps {
  hotelId: string;
}

export default function ToastNotification({ hotelId }: ToastNotificationProps) {
  const supabase = useMemo(() => createClient(), []);
  const [pendingCount, setPendingCount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const fetchPendingCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('reservation_status', 'tentative');

      if (error) throw error;
      
      const newCount = count || 0;
      setPendingCount(newCount);
      
      // Show toast if there are pending reservations
      if (newCount > 0) {
        setShowToast(true);
        // Auto-hide after 5 seconds
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  }, [hotelId, supabase]);

  useEffect(() => {
    void fetchPendingCount();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('pending-reservations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `hotel_id=eq.${hotelId}`
      }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingCount, hotelId, supabase]);

  if (!showToast || pendingCount === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce">
      <div className="rounded-lg bg-orange-500 px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2 text-white">
          <span className="text-lg">⏳</span>
          <span className="font-semibold">{pendingCount} Pending Reservation{pendingCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
