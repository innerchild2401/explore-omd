'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ExperienceBookingProps {
  experienceId: string;
  businessId: string;
  timeSlots: any[];
  selectedDate?: string;
}

export default function ExperienceBooking({ experienceId, businessId, timeSlots, selectedDate }: ExperienceBookingProps) {
  const [formData, setFormData] = useState({
    time_slot_id: '',
    participants: 1,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    special_requests: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedTimeSlot = timeSlots.find(ts => ts.id === formData.time_slot_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const supabase = createClient();

      if (!selectedTimeSlot) {
        setError('Please select a time slot');
        setIsLoading(false);
        return;
      }

      // Create booking
      const { error: bookingError } = await supabase
        .from('experience_bookings')
        .insert({
          experience_id: experienceId,
          time_slot_id: selectedTimeSlot.id,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone || null,
          participants: parseInt(formData.participants.toString()),
          booking_date: selectedTimeSlot.start_date,
          booking_time: selectedTimeSlot.start_time,
          total_price: selectedTimeSlot.price_per_person * parseInt(formData.participants.toString()),
          special_requests: formData.special_requests || null,
        });

      if (bookingError) throw bookingError;

      setSuccess(true);
      
      // Reset form
      setFormData({
        time_slot_id: '',
        participants: 1,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        special_requests: '',
      });
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg className="h-12 w-12 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h3 className="text-lg font-semibold text-green-900 mb-2">Booking Confirmed!</h3>
        <p className="text-green-700">You&apos;ll receive a confirmation email shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Time Slot Selection */}
      {timeSlots.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Time Slot *
          </label>
          <select
            value={formData.time_slot_id}
            onChange={(e) => setFormData({ ...formData, time_slot_id: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">Choose a time...</option>
            {timeSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {new Date(slot.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                at {slot.start_time}
                {slot.duration_minutes && ` (${slot.duration_minutes} min)`}
                {' '}- {require('@/lib/utils').formatPrice(slot.price_per_person, 'RON')} per person
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-sm text-yellow-700">No available time slots. Please select a different date.</p>
        </div>
      )}

      {/* Participants */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Participants *
        </label>
        <input
          type="number"
          min="1"
          max={selectedTimeSlot?.max_participants || 10}
          value={formData.participants}
          onChange={(e) => setFormData({ ...formData, participants: parseInt(e.target.value) || 1 })}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
        {selectedTimeSlot && (
          <p className="mt-1 text-xs text-gray-500">
            Maximum {selectedTimeSlot.max_participants} participants
          </p>
        )}
      </div>

      {/* Price Display */}
      {selectedTimeSlot && formData.participants > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700">Price per person:</span>
            <span className="font-semibold text-gray-900">
              {require('@/lib/utils').formatPrice(selectedTimeSlot.price_per_person, 'RON')}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-blue-200">
            <span className="font-semibold text-gray-900">Total:</span>
            <span className="text-xl font-bold text-blue-600">
              {require('@/lib/utils').formatPrice(selectedTimeSlot.price_per_person * formData.participants, 'RON')}
            </span>
          </div>
        </div>
      )}

      {/* Customer Information */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.customer_email}
            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.customer_phone}
            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Requests
          </label>
          <textarea
            value={formData.special_requests}
            onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !formData.time_slot_id}
        className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Booking...' : 'Book Now'}
      </button>
    </form>
  );
}
