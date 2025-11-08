'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/admin/ImageUpload';
import AmenityIcon from '@/components/ui/AmenityIcon';

interface RoomModalProps {
  hotelId: string;
  room?: any;
  amenities: any[];
  onClose: () => void;
}

export default function RoomModal({ hotelId, room, amenities, onClose }: RoomModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(room?.name || '');
  const [roomType, setRoomType] = useState(room?.room_type || 'double');
  const [maxOccupancy, setMaxOccupancy] = useState(room?.max_occupancy || 2);
  const [sizeSqm, setSizeSqm] = useState(room?.size_sqm || '');
  const [basePrice, setBasePrice] = useState(room?.base_price || '');
  const [quantity, setQuantity] = useState(room?.quantity || 1);
  const [bedConfiguration, setBedConfiguration] = useState<any>(room?.bed_configuration || {});
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(room?.room_amenities || []);
  // Handle both old (string[]) and new ({url, description}[]) format
  const [images, setImages] = useState<Array<{url: string; description: string}>>(
    (room?.images || []).map((img: any) => 
      typeof img === 'string' ? { url: img, description: '' } : img
    )
  );
  const [isActive, setIsActive] = useState(room?.is_active ?? true);

  // Sync images state when room prop changes (after refresh)
  useEffect(() => {
    const updatedImages = (room?.images || []).map((img: any) => 
      typeof img === 'string' ? { url: img, description: '' } : img
    );
    setImages(updatedImages);
  }, [room?.images]);

  const handleSave = async () => {
    console.log('RoomModal - handleSave called');
    
    if (!name || !basePrice) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const roomData = {
        hotel_id: hotelId,
        name,
        room_type: roomType,
        max_occupancy: parseInt(maxOccupancy.toString()),
        size_sqm: sizeSqm ? parseInt(sizeSqm.toString()) : null,
        base_price: parseFloat(basePrice.toString()),
        quantity: parseInt(quantity.toString()),
        bed_configuration: bedConfiguration,
        room_amenities: selectedAmenities,
        images,
        is_active: isActive,
      };

      console.log('RoomModal - Saving room data:', roomData);
      console.log('RoomModal - Is update?', !!room);

      if (room) {
        // Update existing room
        console.log('RoomModal - Updating room:', room.id);
        const { data: updatedData, error: updateError } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', room.id)
          .select();

        console.log('RoomModal - Update result:', { updatedData, updateError });
        if (updateError) throw updateError;
      } else {
        // Create new room
        console.log('RoomModal - Creating new room');
        const { data: newRoom, error: createError } = await supabase
          .from('rooms')
          .insert(roomData)
          .select()
          .single();

        console.log('RoomModal - Create result:', { newRoom, createError });
        if (createError) throw createError;

        // Initialize availability for next 365 days
        if (newRoom) {
          await supabase.rpc('initialize_room_availability', {
            p_room_id: newRoom.id,
            p_start_date: new Date().toISOString().split('T')[0],
            p_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            p_quantity: parseInt(quantity.toString()),
          });
        }
      }

      router.refresh();
      onClose();
      
      // Show success message
      alert('✅ Room saved successfully!');
    } catch (err: any) {
      console.error('Error saving room:', err);
      setError(err.message || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (amenityId: string) => {
    if (selectedAmenities.includes(amenityId)) {
      setSelectedAmenities(selectedAmenities.filter(id => id !== amenityId));
    } else {
      setSelectedAmenities([...selectedAmenities, amenityId]);
    }
  };

  const updateBedConfig = (bedType: string, count: number) => {
    setBedConfiguration({ ...bedConfiguration, [bedType]: count });
  };

  const roomAmenities = amenities.filter(a => a.category === 'room');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {room ? 'Edit Room' : 'Add New Room'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Room Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Deluxe Ocean View"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Room Type *</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="twin">Twin</option>
                <option value="triple">Triple</option>
                <option value="quad">Quad</option>
                <option value="suite">Suite</option>
                <option value="studio">Studio</option>
                <option value="apartment">Apartment</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Max Occupancy *</label>
              <input
                type="number"
                min="1"
                value={maxOccupancy}
                onChange={(e) => setMaxOccupancy(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Size (sqm)</label>
              <input
                type="number"
                min="0"
                value={sizeSqm}
                onChange={(e) => setSizeSqm(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Base Price/Night *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Quantity *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">How many of this room type do you have?</p>
            </div>
          </div>

          {/* Bed Configuration */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Bed Configuration</label>
            <div className="grid gap-3 md:grid-cols-3">
              {['single', 'double', 'queen', 'king', 'sofa_bed'].map((bedType) => (
                <div key={bedType}>
                  <label className="mb-1 block text-xs text-gray-600 capitalize">
                    {bedType.replace('_', ' ')} Beds
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bedConfiguration[bedType] || 0}
                    onChange={(e) => updateBedConfig(bedType, parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Room Amenities */}
          {roomAmenities.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Room Amenities</label>
              <div className="grid gap-2 md:grid-cols-3">
                {roomAmenities.map((amenity) => (
                <label
                  key={amenity.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity.id)}
                      onChange={() => toggleAmenity(amenity.id)}
                      className="h-4 w-4 text-blue-600"
                    />
                  <AmenityIcon icon={amenity.icon} variant="sm" className="bg-blue-50 text-blue-600" />
                  <span className="text-sm text-gray-900 leading-snug break-words">{amenity.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Room Images</label>
            <p className="mb-3 text-xs text-gray-500">Add 3-8 images. First image will be the main thumbnail.</p>
            <div className="space-y-3">
              {images.map((img, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative h-20 w-32 overflow-hidden rounded">
                        <Image
                          src={img.url}
                          alt={`Room ${idx + 1}`}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {idx === 0 ? 'Main Photo' : `Photo ${idx + 1}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Photo Label (e.g., &quot;Bedroom&quot;, &quot;Bathroom&quot;, &quot;View&quot;)
                    </label>
                    <input
                      type="text"
                      value={img.description}
                      onChange={(e) => {
                        const newImages = [...images];
                        newImages[idx] = { ...newImages[idx], description: e.target.value };
                        setImages(newImages);
                      }}
                      maxLength={30}
                      placeholder="e.g., King Bed, Bathroom, Balcony View"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
              {images.length < 8 && (
                <ImageUpload
                  value=""
                  onChange={(url) => setImages([...images, { url, description: '' }])}
                  bucket="images"
                  folder="rooms"
                  maxSizeMB={5}
                  recommendedSize="1200×800px (3:2 aspect ratio)"
                />
              )}
            </div>
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Active (visible to guests)</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? 'Saving...' : room ? 'Update Room' : 'Create Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

