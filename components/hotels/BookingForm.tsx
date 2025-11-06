'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BookingFormProps {
  hotelId: string;
  roomId: string;
  roomName: string;
  onBookingSubmitted?: () => void;
}

export default function BookingForm({ hotelId, roomId, roomName, onBookingSubmitted }: BookingFormProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    check_in_date: '',
    check_out_date: '',
    adults: 2,
    children: 0,
    infants: 0,
    special_requests: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // First, check if guest profile exists or create it
      let { data: guestProfile } = await supabase
        .from('guest_profiles')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      let guestId: string;

      if (!guestProfile) {
        // Create new guest profile
        const { data: newGuest, error: guestError } = await supabase
          .from('guest_profiles')
          .insert({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone
          })
          .select('id')
          .single();

        if (guestError) throw guestError;
        guestId = newGuest.id;
      } else {
        guestId = guestProfile.id;
      }

      // Get or create booking channel (website)
      let { data: channel } = await supabase
        .from('booking_channels')
        .select('id')
        .eq('name', 'website')
        .maybeSingle();

      if (!channel) {
        const { data: newChannel, error: channelError } = await supabase
          .from('booking_channels')
          .insert({
            name: 'website',
            display_name: 'Website',
            channel_type: 'direct'
          })
          .select('id')
          .single();
        
        if (channelError) throw channelError;
        channel = newChannel;
      }
      
      if (!channel || !channel.id) {
        throw new Error('Failed to get or create booking channel');
      }

      // Create tentative reservation
      const confirmationNumber = `WEB-${Date.now()}`;

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          confirmation_number: confirmationNumber,
          hotel_id: hotelId,
          guest_id: guestId,
          channel_id: channel.id,
          room_id: roomId,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          adults: formData.adults,
          children: formData.children,
          infants: formData.infants,
          special_requests: formData.special_requests || null,
          reservation_status: 'tentative', // Requires admin approval
          payment_status: 'pending',
          base_rate: 0, // Will be calculated when approved
          total_amount: 0,
          currency: 'RON',
          confirmation_sent: false
        })
        .select('id')
        .single();

      if (reservationError) throw reservationError;

      // Verify reservation was created
      if (!reservation || !reservation.id) {
        console.error('Reservation created but no ID returned:', reservation);
        throw new Error('Failed to create reservation - no ID returned');
      }

      console.log('✅ Reservation created successfully:', reservation.id);

      // Schedule email sequence (fire-and-forget)
      (async () => {
        try {
          await fetch('/api/email/sequence/schedule', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reservationId: reservation.id }),
          });
        } catch (err) {
          console.error('Failed to schedule email sequence:', err);
        }
      })();

      // Push booking to channel manager (if applicable) - fire-and-forget
      (async () => {
        try {
          const pushResponse = await fetch('/api/channel-manager/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reservationId: reservation.id }),
          });

          if (!pushResponse.ok) {
            const pushResult = await pushResponse.json().catch(() => ({ error: 'Failed to parse response' }));
            console.error('❌ Failed to push booking to channel manager:', pushResult);
          } else {
            const pushResult = await pushResponse.json().catch(() => ({}));
            console.log('✅ Booking pushed to channel manager:', pushResult);
          }
        } catch (pushError: any) {
          console.error('❌ Error pushing booking to channel manager:', pushError);
          // Don't fail the booking if push fails - it will be handled by the admin
        }
      })();

      // Send booking confirmation emails (fire-and-forget to not block the UI)
      // This will execute asynchronously and not block the success message
      (async () => {
        try {
          console.log('📧 Starting email API call for reservation:', reservation.id);
          const apiUrl = '/api/email/booking-confirmation';
          console.log('📧 API endpoint URL:', apiUrl);
          console.log('📧 Request payload:', { reservationId: reservation.id });
          
          const requestBody = {
            reservationId: reservation.id,
          };
          
          console.log('📧 About to call fetch...');
          const emailResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          
          console.log('📧 Email API response received');
          console.log('📧 Email API response status:', emailResponse.status);
          
          if (!emailResponse.ok) {
            const emailResult = await emailResponse.json().catch(() => ({ error: 'Failed to parse response' }));
            console.error('❌ Failed to send booking confirmation email:', emailResult);
            console.error('Response status:', emailResponse.status);
          } else {
            const emailResult = await emailResponse.json().catch(() => ({}));
            console.log('✅ Booking confirmation email sent successfully:', emailResult);
          }
        } catch (emailError: any) {
          console.error('❌ CRITICAL: Error sending booking confirmation email:', emailError);
          console.error('Error name:', emailError?.name);
          console.error('Error message:', emailError?.message);
          console.error('Error stack:', emailError?.stack);
          // Don't fail the booking if email fails
        }
      })();

      setSuccess(true);
      onBookingSubmitted?.();

      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        check_in_date: '',
        check_out_date: '',
        adults: 2,
        children: 0,
        infants: 0,
        special_requests: ''
      });
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Booking Request Submitted</h3>
        <p className="text-green-700">
          Your booking request for <strong>{roomName}</strong> has been submitted successfully. 
          You&apos;ll receive a confirmation email once the hotel admin processes your request.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            id="first_name"
            required
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            id="last_name"
            required
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          id="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone *
        </label>
        <input
          type="tel"
          id="phone"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="check_in_date" className="block text-sm font-medium text-gray-700 mb-1">
            Check-in Date *
          </label>
          <input
            type="date"
            id="check_in_date"
            required
            value={formData.check_in_date}
            onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="check_out_date" className="block text-sm font-medium text-gray-700 mb-1">
            Check-out Date *
          </label>
          <input
            type="date"
            id="check_out_date"
            required
            value={formData.check_out_date}
            onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="adults" className="block text-sm font-medium text-gray-700 mb-1">
            Adults *
          </label>
          <input
            type="number"
            id="adults"
            required
            min="1"
            value={formData.adults}
            onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="children" className="block text-sm font-medium text-gray-700 mb-1">
            Children
          </label>
          <input
            type="number"
            id="children"
            min="0"
            value={formData.children}
            onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="infants" className="block text-sm font-medium text-gray-700 mb-1">
            Infants
          </label>
          <input
            type="number"
            id="infants"
            min="0"
            value={formData.infants}
            onChange={(e) => setFormData({ ...formData, infants: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="special_requests" className="block text-sm font-medium text-gray-700 mb-1">
          Special Requests
        </label>
        <textarea
          id="special_requests"
          rows={3}
          value={formData.special_requests}
          onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Request Booking'}
      </button>
    </form>
  );
}
