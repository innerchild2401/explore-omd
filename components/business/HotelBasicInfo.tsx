'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/admin/ImageUpload';
import OctorateConnection from './OctorateConnection';
import OctorateSyncStatus from './OctorateSyncStatus';

interface HotelBasicInfoProps {
  business: any;
  hotel: any;
  amenities: any[];
}

export default function HotelBasicInfo({ business, hotel, amenities }: HotelBasicInfoProps) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Business fields
  const [name, setName] = useState(business.name || '');
  const [description, setDescription] = useState(business.description || '');
  const [phone, setPhone] = useState(business.contact?.phone || '');
  const [email, setEmail] = useState(business.contact?.email || '');
  const [address, setAddress] = useState(business.location?.address || '');
  
  // Handle both old (string[]) and new ({url, description}[]) format
  const [images, setImages] = useState<Array<{url: string; description: string}>>(
    (business.images || []).map((img: any) => 
      typeof img === 'string' ? { url: img, description: '' } : img
    )
  );

  // Sync images state when business prop changes (after refresh)
  useEffect(() => {
    const updatedImages = (business.images || []).map((img: any) => 
      typeof img === 'string' ? { url: img, description: '' } : img
    );
    setImages(updatedImages);
  }, [business.images]);
  
  // Hotel fields
  const [propertySubtype, setPropertySubtype] = useState(hotel.property_subtype || 'hotel');
  const [starRating, setStarRating] = useState(hotel.star_rating || 3);
  const [checkInTime, setCheckInTime] = useState(hotel.check_in_time || '14:00');
  const [checkOutTime, setCheckOutTime] = useState(hotel.check_out_time || '12:00');
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>(hotel.languages_spoken || []);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(hotel.selected_amenities || []);
  const [locationHighlights, setLocationHighlights] = useState(hotel.location_highlights || '');
  
  const [newLanguage, setNewLanguage] = useState('');
  
  // Areas
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(business.area_id || '');

  // Fetch areas for this OMD
  useEffect(() => {
    const fetchAreas = async () => {
      if (business.omd_id) {
        const { data } = await supabase
          .from('areas')
          .select('*')
          .eq('omd_id', business.omd_id)
          .order('order_index', { ascending: true })
          .order('name', { ascending: true });
        
        if (data) {
          setAreas(data);
        }
      }
    };
    
    fetchAreas();
  }, [business.omd_id, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    try {
      // Update business
      const { data: updatedBusiness, error: businessError } = await supabase
        .from('businesses')
        .update({
          name,
          description,
          contact: {
            ...business.contact,
            phone,
            email,
          },
          location: {
            ...business.location,
            address,
          },
          images,
          area_id: selectedAreaId || null,
        })
        .eq('id', business.id)
        .select();

      if (businessError) {
        throw businessError;
      }

      // Update hotel
      const { error: hotelError } = await supabase
        .from('hotels')
        .update({
          property_subtype: propertySubtype,
          star_rating: starRating,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          languages_spoken: languagesSpoken,
          selected_amenities: selectedAmenities,
          location_highlights: locationHighlights,
        })
        .eq('id', hotel.id);

      if (hotelError) {
        throw hotelError;
      }

      // Success - refresh the page to get updated data
      router.refresh();
      
      // Show success message
      alert('✅ Hotel information saved successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save: ' + err.message);
      alert('Error: ' + err.message);
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

  const addLanguage = () => {
    if (newLanguage && !languagesSpoken.includes(newLanguage)) {
      setLanguagesSpoken([...languagesSpoken, newLanguage]);
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setLanguagesSpoken(languagesSpoken.filter(l => l !== lang));
  };

  const groupedAmenities = {
    general: amenities.filter(a => a.category === 'general'),
    room: amenities.filter(a => a.category === 'room'),
    facility: amenities.filter(a => a.category === 'facility'),
  };

  return (
    <div className="space-y-6">
      {/* Business Information */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Business Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Hotel Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Address *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Area</label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="">No area selected</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Select the area where your hotel is located</p>
          </div>

          {/* Hotel Images */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Hotel Photos</label>
            <p className="mb-3 text-xs text-gray-500">
              Upload 5-15 photos showing your property (exterior, lobby, facilities, common areas). First image will be the main thumbnail.
            </p>
            <div className="space-y-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative">
                  <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {/* Thumbnail */}
                    <img 
                      src={img.url} 
                      alt={`Hotel ${idx + 1}`} 
                      className="h-20 w-32 flex-shrink-0 rounded object-cover"
                    />
                    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {idx === 0 ? '⭐ Main Photo' : `Photo ${idx + 1}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, i) => i !== idx))}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                      
                      {/* Label Input with Clear Button */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={img.description}
                          onChange={(e) => {
                            const newImages = [...images];
                            newImages[idx] = { ...newImages[idx], description: e.target.value };
                            setImages(newImages);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          maxLength={30}
                          placeholder="Add label (e.g., Pool, Gym, Lobby)"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        {img.description && (
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = [...images];
                              newImages[idx] = { ...newImages[idx], description: '' };
                              setImages(newImages);
                            }}
                            className="rounded-lg bg-gray-200 p-2 text-gray-600 hover:bg-gray-300"
                            title="Clear label"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        💡 Press Enter or click outside to finish. Label will appear on photo.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {images.length < 15 && (
                <ImageUpload
                  value=""
                  onChange={(url) => setImages([...images, { url, description: '' }])}
                  bucket="images"
                  folder="hotels"
                  maxSizeMB={5}
                  recommendedSize="1200×800px (3:2 aspect ratio)"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hotel Details */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Hotel Details</h2>
        
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Property Type</label>
              <select
                value={propertySubtype}
                onChange={(e) => setPropertySubtype(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="hotel">Hotel</option>
                <option value="bnb">B&B</option>
                <option value="guesthouse">Guesthouse</option>
                <option value="hostel">Hostel</option>
                <option value="resort">Resort</option>
                <option value="apartment">Apartment</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Star Rating</label>
              <select
                value={starRating}
                onChange={(e) => setStarRating(parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <option key={star} value={star}>{'⭐'.repeat(star)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Check-in Time</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Check-out Time</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Location Highlights</label>
            <textarea
              value={locationHighlights}
              onChange={(e) => setLocationHighlights(e.target.value)}
              rows={2}
              placeholder="e.g., 5 min walk to beach, 10 min from city center"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Languages */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Languages Spoken</label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                placeholder="Add language"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={addLanguage}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {languagesSpoken.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {lang}
                  <button onClick={() => removeLanguage(lang)} className="hover:text-blue-900">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Channel Manager / PMS Connection */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Channel Manager Integration</h2>
        <p className="mb-4 text-sm text-gray-600">
          Connect your external PMS (like Octorate) to sync inventory, availability, and rates automatically.
          When connected, your data will be synced from Octorate and displayed read-only on this platform.
        </p>
        <OctorateConnection 
          hotelId={hotel.id} 
          businessId={business.id}
          onConnected={() => router.refresh()}
        />
        <div className="mt-4">
          <OctorateSyncStatus hotelId={hotel.id} />
        </div>
      </div>

      {/* Amenities */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Amenities</h2>
        
        {(['general', 'facility', 'room'] as const).map((category) => (
          <div key={category} className="mb-6">
            <h3 className="mb-3 font-semibold capitalize text-gray-900">{category} Amenities</h3>
            <div className="grid gap-2 md:grid-cols-3">
              {groupedAmenities[category].map((amenity) => (
                <label
                  key={amenity.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(amenity.id)}
                    onChange={() => toggleAmenity(amenity.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                  {amenity.icon && <span>{amenity.icon}</span>}
                  <span className="text-sm text-gray-900">{amenity.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

