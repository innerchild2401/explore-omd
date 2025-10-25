'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/admin/ImageUpload';

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
  const [images, setImages] = useState<string[]>(business.images || []);
  
  // Hotel fields
  const [propertySubtype, setPropertySubtype] = useState(hotel.property_subtype || 'hotel');
  const [starRating, setStarRating] = useState(hotel.star_rating || 3);
  const [checkInTime, setCheckInTime] = useState(hotel.check_in_time || '14:00');
  const [checkOutTime, setCheckOutTime] = useState(hotel.check_out_time || '12:00');
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>(hotel.languages_spoken || []);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(hotel.selected_amenities || []);
  const [locationHighlights, setLocationHighlights] = useState(hotel.location_highlights || '');
  
  const [newLanguage, setNewLanguage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    try {
      // Update business
      const { error: businessError } = await supabase
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
        })
        .eq('id', business.id);

      if (businessError) throw businessError;

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

      if (hotelError) throw hotelError;

      router.refresh();
      alert('Saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
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

          {/* Hotel Images */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Hotel Photos</label>
            <p className="mb-3 text-xs text-gray-500">
              Upload 5-15 photos showing your property (exterior, lobby, facilities, common areas). First image will be the main thumbnail.
            </p>
            <div className="space-y-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <div className="flex items-center gap-3">
                      <img src={img} alt={`Hotel ${idx + 1}`} className="h-20 w-32 rounded object-cover" />
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
                </div>
              ))}
              {images.length < 15 && (
                <ImageUpload
                  value=""
                  onChange={(url) => setImages([...images, url])}
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

