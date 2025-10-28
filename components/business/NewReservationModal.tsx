'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NewReservationModalProps {
  hotelId: string;
  rooms: any[];
  onClose: () => void;
  onSuccess: () => void;
}

interface Room {
  id: string;
  name: string;
  room_type: string;
  max_occupancy: number;
  base_price: number;
  quantity: number;
  available_quantity?: number;
  is_active: boolean;
}

interface GuestProfile {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  nationality?: string;
  special_requests?: string;
}

export default function NewReservationModal({ hotelId, rooms, onClose, onSuccess }: NewReservationModalProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [guestData, setGuestData] = useState<GuestProfile>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    nationality: '',
    special_requests: ''
  });

  const [bookingData, setBookingData] = useState({
    check_in_date: '',
    check_out_date: '',
    adults: 1,
    children: 0,
    infants: 0,
    room_id: '',
    arrival_time: 'afternoon',
    group_name: '',
    corporate_code: ''
  });

  const [pricingData, setPricingData] = useState({
    base_rate: 0,
    taxes: 0,
    fees: 0,
    total_amount: 0,
    currency: 'EUR'
  });

  const [confirmationData, setConfirmationData] = useState({
    confirmation_number: '',
    reservation_status: 'confirmed',
    payment_status: 'pending'
  });

  // Available rooms for selected dates
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const steps = [
    { id: 1, title: 'Guest Information', description: 'Enter guest details' },
    { id: 2, title: 'Booking Details', description: 'Select dates and room' },
    { id: 3, title: 'Pricing & Confirmation', description: 'Review and confirm' }
  ];

  // Check room availability when dates change
  useEffect(() => {
    if (bookingData.check_in_date && bookingData.check_out_date) {
      checkRoomAvailability();
    }
  }, [bookingData.check_in_date, bookingData.check_out_date]);

  // Calculate pricing when room is selected
  useEffect(() => {
    if (selectedRoom && bookingData.check_in_date && bookingData.check_out_date) {
      calculatePricing();
    }
  }, [selectedRoom, bookingData.check_in_date, bookingData.check_out_date]);

  const checkRoomAvailability = async () => {
    try {
      if (!bookingData.check_in_date || !bookingData.check_out_date) {
        setAvailableRooms([]);
        return;
      }

      // Check availability for each room individually
      const availabilityChecks = await Promise.all(
        rooms.map(async (room) => {
          try {
            const { data, error } = await supabase
              .rpc('check_room_availability', {
                p_room_id: room.id,
                p_check_in: bookingData.check_in_date,
                p_check_out: bookingData.check_out_date
              });

            if (error) throw error;

            // Get actual availability from room_availability table
            const { data: availabilityData, error: availabilityError } = await supabase
              .from('room_availability')
              .select('available_quantity')
              .eq('room_id', room.id)
              .eq('date', bookingData.check_in_date)
              .maybeSingle();

            if (availabilityError) {
              throw availabilityError;
            }

            const availableQuantity = availabilityData?.available_quantity || room.quantity;
            
            return {
              ...room,
              available_quantity: availableQuantity,
              is_available: availableQuantity > 0
            };
          } catch (err) {
            console.error(`Error checking availability for room ${room.name}:`, err);
            return {
              ...room,
              available_quantity: room.quantity,
              is_available: true // Fallback to showing as available
            };
          }
        })
      );

      // Only show rooms that are actually available
      setAvailableRooms(availabilityChecks.filter(room => room.is_available));
    } catch (err: any) {
      console.error('Error checking availability:', err);
      // Fallback: show all active rooms
      setAvailableRooms(rooms.filter(room => room.is_active));
    }
  };

  const calculatePricing = () => {
    if (!selectedRoom || !bookingData.check_in_date || !bookingData.check_out_date) return;

    const checkIn = new Date(bookingData.check_in_date);
    const checkOut = new Date(bookingData.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    const baseRate = selectedRoom.base_price * nights;
    const taxes = baseRate * 0.1; // 10% tax
    const fees = 0; // No additional fees for now
    const totalAmount = baseRate + taxes + fees;

    setPricingData({
      base_rate: baseRate,
      taxes: taxes,
      fees: fees,
      total_amount: totalAmount,
      currency: 'EUR'
    });
  };

  const generateConfirmationNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${dateStr}-${randomStr}`;
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Check authentication status
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Check room availability before proceeding
      if (!selectedRoom || !bookingData.check_in_date || !bookingData.check_out_date) {
        throw new Error('Missing booking information');
      }

      // Check availability for each date in the stay
      const checkIn = new Date(bookingData.check_in_date);
      const checkOut = new Date(bookingData.check_out_date);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i < nights; i++) {
        const checkDate = new Date(checkIn);
        checkDate.setDate(checkIn.getDate() + i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        // Get availability for this specific date
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('room_availability')
          .select('available_quantity')
          .eq('room_id', selectedRoom.id)
          .eq('date', dateStr)
          .maybeSingle();

        if (availabilityError) {
          throw availabilityError;
        }

        const availableQuantity = availabilityData?.available_quantity || selectedRoom.quantity;
        
        if (availableQuantity <= 0) {
          throw new Error(`Room ${selectedRoom.name} is not available on ${dateStr}. Only ${availableQuantity} rooms available.`);
        }
      }

      // Generate confirmation number
      const confirmationNumber = generateConfirmationNumber();
      setConfirmationData(prev => ({ ...prev, confirmation_number: confirmationNumber }));

      // Check if guest profile already exists, if not create one
      let guestProfile;
      
      // First, try to find existing guest profile
      const { data: existingGuest, error: findError } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('email', guestData.email)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (existingGuest) {
        // Guest exists, update their information
        const { data: updatedGuest, error: updateError } = await supabase
          .from('guest_profiles')
          .update({
            first_name: guestData.first_name,
            last_name: guestData.last_name,
            phone: guestData.phone || existingGuest.phone,
            nationality: guestData.nationality || existingGuest.nationality,
            special_requests: guestData.special_requests || existingGuest.special_requests
          })
          .eq('id', existingGuest.id)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        guestProfile = updatedGuest;
      } else {
        // Guest doesn't exist, create new profile
        const { data: newGuest, error: createError } = await supabase
          .from('guest_profiles')
          .insert({
            first_name: guestData.first_name,
            last_name: guestData.last_name,
            email: guestData.email,
            phone: guestData.phone || null,
            nationality: guestData.nationality || null,
            special_requests: guestData.special_requests || null
          })
          .select()
          .maybeSingle();

        if (createError) throw createError;
        guestProfile = newGuest;
      }

      // Get direct booking channel
      const { data: directChannel, error: channelError } = await supabase
        .from('booking_channels')
        .select('id')
        .eq('name', 'direct')
        .maybeSingle();

      if (channelError) throw channelError;

      if (!directChannel) {
        throw new Error('Direct booking channel not found. Please contact support.');
      }

      // Create reservation
      const reservationData = {
        confirmation_number: confirmationNumber,
        hotel_id: hotelId,
        guest_id: guestProfile.id,
        channel_id: directChannel.id,
        check_in_date: bookingData.check_in_date, // Keep as string, PostgreSQL will handle conversion
        check_out_date: bookingData.check_out_date, // Keep as string, PostgreSQL will handle conversion
        adults: parseInt(bookingData.adults.toString()),
        children: parseInt(bookingData.children.toString()),
        infants: parseInt(bookingData.infants.toString()),
        room_id: bookingData.room_id,
        base_rate: parseFloat(pricingData.base_rate.toString()),
        taxes: parseFloat(pricingData.taxes.toString()),
        fees: parseFloat(pricingData.fees.toString()),
        total_amount: parseFloat(pricingData.total_amount.toString()),
        currency: pricingData.currency,
        reservation_status: confirmationData.reservation_status,
        payment_status: confirmationData.payment_status,
        special_requests: guestData.special_requests || null,
        arrival_time: bookingData.arrival_time,
        group_name: bookingData.group_name || null,
        corporate_code: bookingData.corporate_code || null
      };


      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert(reservationData)
        .select()
        .single();

      if (reservationError) throw reservationError;

      // Try to auto-assign an individual room if available
      try {
        const { data: assignedRoom, error: assignError } = await supabase.rpc(
          'auto_assign_room_for_reservation',
          {
            p_reservation_id: reservation.id,
            p_room_type_id: bookingData.room_id,
            p_check_in_date: bookingData.check_in_date,
            p_check_out_date: bookingData.check_out_date,
            p_preferences: {}
          }
        );

        if (assignError) {
          console.log('Could not auto-assign room:', assignError.message);
          // Not a critical error - reservation is created, room can be assigned later
        }
      } catch (assignErr) {
        console.log('Room assignment skipped:', assignErr);
        // Continue anyway - reservation is created
      }

      setSuccess(`Reservation created successfully! Confirmation: ${confirmationNumber}`);
      
      // Wait a moment then close and refresh
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Error creating reservation:', err);
      setError(err.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">New Reservation</h2>
              <p className="text-sm text-gray-600">Create a new booking for a guest</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    currentStep >= step.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`ml-6 w-16 h-0.5 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Guest Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={guestData.first_name}
                      onChange={(e) => setGuestData({...guestData, first_name: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={guestData.last_name}
                      onChange={(e) => setGuestData({...guestData, last_name: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={guestData.email}
                      onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={guestData.phone}
                      onChange={(e) => setGuestData({...guestData, phone: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={guestData.nationality}
                      onChange={(e) => setGuestData({...guestData, nationality: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      placeholder="Enter nationality"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arrival Time
                    </label>
                    <select
                      value={bookingData.arrival_time}
                      onChange={(e) => setBookingData({...bookingData, arrival_time: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="morning">Morning (6AM - 12PM)</option>
                      <option value="afternoon">Afternoon (12PM - 6PM)</option>
                      <option value="evening">Evening (6PM - 12AM)</option>
                      <option value="late_night">Late Night (12AM - 6AM)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requests
                  </label>
                  <textarea
                    value={guestData.special_requests}
                    onChange={(e) => setGuestData({...guestData, special_requests: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    rows={3}
                    placeholder="Any special requests or notes..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Booking Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Date *
                    </label>
                    <input
                      type="date"
                      value={bookingData.check_in_date}
                      onChange={(e) => setBookingData({...bookingData, check_in_date: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out Date *
                    </label>
                    <input
                      type="date"
                      value={bookingData.check_out_date}
                      onChange={(e) => setBookingData({...bookingData, check_out_date: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adults *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bookingData.adults}
                      onChange={(e) => setBookingData({...bookingData, adults: parseInt(e.target.value)})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Children
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bookingData.children}
                      onChange={(e) => setBookingData({...bookingData, children: parseInt(e.target.value)})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Infants
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bookingData.infants}
                      onChange={(e) => setBookingData({...bookingData, infants: parseInt(e.target.value)})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={bookingData.group_name}
                      onChange={(e) => setBookingData({...bookingData, group_name: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      placeholder="Enter group name if applicable"
                    />
                  </div>
                </div>
              </div>

              {/* Room Selection */}
              {bookingData.check_in_date && bookingData.check_out_date && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Available Rooms</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {availableRooms.map(room => (
                      <div
                        key={room.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          selectedRoom?.id === room.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedRoom(room);
                          setBookingData({...bookingData, room_id: room.id});
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-gray-900">{room.name}</h5>
                            <p className="text-sm text-gray-600 capitalize">
                              {room.room_type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-600">
                              Max {room.max_occupancy} guests • {room.available_quantity || room.quantity} available
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(room.base_price)}/night
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Pricing & Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Confirmation</h3>
                
                {/* Pricing Breakdown */}
                {selectedRoom && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Pricing Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Room Rate ({selectedRoom.name})</span>
                        <span className="font-medium">{formatCurrency(pricingData.base_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxes (10%)</span>
                        <span className="font-medium">{formatCurrency(pricingData.taxes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fees</span>
                        <span className="font-medium">{formatCurrency(pricingData.fees)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Total Amount</span>
                          <span className="font-bold text-lg text-gray-900">
                            {formatCurrency(pricingData.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reservation Status */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reservation Status
                    </label>
                    <select
                      value={confirmationData.reservation_status}
                      onChange={(e) => setConfirmationData({...confirmationData, reservation_status: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="tentative">Tentative</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={confirmationData.payment_status}
                      onChange={(e) => setConfirmationData({...confirmationData, payment_status: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div>
                </div>

                {/* Booking Summary */}
                <div className="mt-6 bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">Booking Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Guest:</span>
                      <span className="text-blue-900 font-medium">
                        {guestData.first_name} {guestData.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Email:</span>
                      <span className="text-blue-900">{guestData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Dates:</span>
                      <span className="text-blue-900">
                        {bookingData.check_in_date && bookingData.check_out_date
                          ? `${formatDate(bookingData.check_in_date)} - ${formatDate(bookingData.check_out_date)}`
                          : 'Not selected'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Room:</span>
                      <span className="text-blue-900">{selectedRoom?.name || 'Not selected'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Guests:</span>
                      <span className="text-blue-900">
                        {bookingData.adults} adults
                        {bookingData.children > 0 && `, ${bookingData.children} children`}
                        {bookingData.infants > 0 && `, ${bookingData.infants} infants`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
          )}
          {success && (
            <div className="mt-4 rounded-lg bg-green-50 p-4 text-green-600">{success}</div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && (!guestData.first_name || !guestData.last_name || !guestData.email)) ||
                    (currentStep === 2 && (!bookingData.check_in_date || !bookingData.check_out_date || !selectedRoom))
                  }
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Reservation'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
