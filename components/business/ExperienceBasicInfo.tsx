'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ImageUpload from '@/components/admin/ImageUpload';

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  contact: any;
  location: any;
  omd_id: string;
}

interface Experience {
  id: string;
  business_id: string;
  category: string | null;
  duration: string | null;
  difficulty_level: string | null;
  min_participants: number;
  max_participants: number | null;
  price: number | null;
  price_from: number | null;
  currency: string | null;
  includes: any;
  requirements: any;
  meeting_point: any;
  included: string[] | null;
  not_included: string[] | null;
  important_info: string[] | null;
  tags: string[] | null;
  cancellation_policy: string | null;
  instant_confirmation: boolean;
  languages: string[] | null;
  wheelchair_accessible: boolean;
}

interface ExperienceBasicInfoProps {
  business: Business;
  experience: Experience;
  onUpdate: () => void;
}

export default function ExperienceBasicInfo({
  business,
  experience,
  onUpdate,
}: ExperienceBasicInfoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<Array<{url: string; description: string}>>(
    (business.images || []).map((img: any) => 
      typeof img === 'string' ? { url: img, description: '' } : img
    )
  );
  
  const [includedItems, setIncludedItems] = useState<string[]>(experience.included || []);
  const [notIncludedItems, setNotIncludedItems] = useState<string[]>(experience.not_included || []);
  const [importantInfoItems, setImportantInfoItems] = useState<string[]>(experience.important_info || []);
  const [tags, setTags] = useState<string[]>(experience.tags || []);

  const [formData, setFormData] = useState({
    // Business fields
    name: business.name || '',
    description: business.description || '',
    phone: business.contact?.phone || '',
    email: business.contact?.email || '',
    website: business.contact?.website || '',
    address: business.location?.address || '',
    
    // Experience fields
    category: experience.category || '',
    duration: experience.duration || '',
    difficulty_level: experience.difficulty_level || '',
    min_participants: experience.min_participants || 1,
    max_participants: experience.max_participants || '',
    price_from: experience.price_from || '',
    currency: experience.currency || 'USD',
    meeting_point_address: experience.meeting_point?.address || '',
    meeting_point_description: experience.meeting_point?.description || '',
    cancellation_policy: experience.cancellation_policy || '',
    instant_confirmation: experience.instant_confirmation || false,
    wheelchair_accessible: experience.wheelchair_accessible || false,
    languages: (experience.languages || []).join(', '),
  });

  // Sync images state when business prop changes (after refresh)
  useEffect(() => {
    const updatedImages = (business.images || []).map((img: any) => 
      typeof img === 'string' ? { url: img, description: '' } : img
    );
    setImages(updatedImages);
  }, [business.images]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Update business information
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          name: formData.name,
          description: formData.description,
          images,
          contact: {
            phone: formData.phone,
            email: formData.email,
            website: formData.website,
          },
          location: {
            address: formData.address,
          },
        })
        .eq('id', business.id);

      if (businessError) {
        console.error('Business update error:', businessError);
        throw businessError;
      }

      // Update experience information
      const updateData: any = {
        category: formData.category || null,
        duration: formData.duration || null,
        difficulty_level: formData.difficulty_level || null,
        min_participants: formData.min_participants || 1,
        max_participants: formData.max_participants ? parseInt(formData.max_participants.toString()) : null,
        price_from: formData.price_from ? parseFloat(formData.price_from.toString()) : null,
        currency: formData.currency || 'USD',
        meeting_point: {
          address: formData.meeting_point_address || null,
          description: formData.meeting_point_description || null,
        },
        included: includedItems,
        not_included: notIncludedItems,
        important_info: importantInfoItems,
        tags: tags,
        cancellation_policy: formData.cancellation_policy || null,
        instant_confirmation: formData.instant_confirmation || false,
        wheelchair_accessible: formData.wheelchair_accessible || false,
      };

      // Only add languages if provided
      if (formData.languages) {
        updateData.languages = formData.languages.split(',').map((l: string) => l.trim()).filter((l: string) => l);
      }

      const { error: experienceError } = await supabase
        .from('experiences')
        .update(updateData)
        .eq('id', experience.id);

      if (experienceError) {
        console.error('Experience update error:', experienceError);
        throw experienceError;
      }

      onUpdate();
    } catch (error: any) {
      console.error('Error updating experience:', error);
      alert('Error: ' + (error.message || 'Failed to save changes'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addArrayItem = (items: string[], setItems: (items: string[]) => void, newItem: string) => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
    }
  };

  const removeArrayItem = (items: string[], setItems: (items: string[]) => void, index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Experience Information</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Experience Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Guided Tour, Adventure, Cultural"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe your experience, what makes it special, what guests can expect..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Experience Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Experience Details</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="e.g., 3 hours, Full day, 2-3 hours"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="difficulty_level" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  id="difficulty_level"
                  name="difficulty_level"
                  value={formData.difficulty_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="challenging">Challenging</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label htmlFor="min_participants" className="block text-sm font-medium text-gray-700 mb-1">
                  Min Participants
                </label>
                <input
                  type="number"
                  id="min_participants"
                  name="min_participants"
                  value={formData.min_participants}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Participants
                </label>
                <input
                  type="number"
                  id="max_participants"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="price_from" className="block text-sm font-medium text-gray-700 mb-1">
                  Price From
                </label>
                <input
                  type="number"
                  id="price_from"
                  name="price_from"
                  value={formData.price_from}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="e.g., 49.99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeArrayItem(tags, setTags, idx)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add a tag (e.g., family-friendly, romantic, adventure) and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem(tags, setTags, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Meeting Point */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Meeting Point</h3>
            
            <div>
              <label htmlFor="meeting_point_address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                id="meeting_point_address"
                name="meeting_point_address"
                value={formData.meeting_point_address}
                onChange={handleInputChange}
                placeholder="e.g., 123 Main Street, City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="meeting_point_description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="meeting_point_description"
                name="meeting_point_description"
                value={formData.meeting_point_description}
                onChange={handleInputChange}
                rows={2}
                placeholder="e.g., Meet at the entrance of the main square, look for the blue umbrella"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* What's Included */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">What&apos;s Included</h3>
            <div className="space-y-2">
              {includedItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-900">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeArrayItem(includedItems, setIncludedItems, idx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                type="text"
                placeholder="Add what&apos;s included (e.g., Professional guide, Equipment, Lunch)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem(includedItems, setIncludedItems, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* What's NOT Included */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">What&apos;s NOT Included</h3>
            <div className="space-y-2">
              {notIncludedItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-900">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeArrayItem(notIncludedItems, setNotIncludedItems, idx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                type="text"
                placeholder="Add what&apos;s not included (e.g., Hotel pickup, Gratuities)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem(notIncludedItems, setNotIncludedItems, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Important Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Important Information</h3>
            <div className="space-y-2">
              {importantInfoItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-900">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeArrayItem(importantInfoItems, setImportantInfoItems, idx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                type="text"
                placeholder="Add important info (e.g., Not suitable for pregnant women, Wear comfortable shoes)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem(importantInfoItems, setImportantInfoItems, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Cancellation Policy</h3>
            <textarea
              id="cancellation_policy"
              name="cancellation_policy"
              value={formData.cancellation_policy}
              onChange={handleInputChange}
              rows={3}
              placeholder="e.g., Free cancellation up to 24 hours before the experience starts"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., (555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g., info@experience.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="e.g., https://experience.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g., 123 Main St, City, State 12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-1">
                Languages Available
              </label>
              <input
                type="text"
                id="languages"
                name="languages"
                value={formData.languages}
                onChange={handleInputChange}
                placeholder="e.g., English, Spanish, French"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Options</h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="instant_confirmation"
                  checked={formData.instant_confirmation}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Instant confirmation available
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="wheelchair_accessible"
                  checked={formData.wheelchair_accessible}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Wheelchair accessible
                </span>
              </label>
            </div>
          </div>

          {/* Experience Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Experience Images</h3>
            <p className="text-sm text-gray-600">
              Upload 3-10 photos showing your experience. First image will be the main thumbnail.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={img.url}
                      alt={`Experience image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                  >
                    ×
                  </button>
                  
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Image description (optional)"
                      value={img.description}
                      onChange={(e) => {
                        const newImages = [...images];
                        newImages[idx] = { ...newImages[idx], description: e.target.value };
                        setImages(newImages);
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                </div>
              ))}
              
              {images.length < 10 && (
                <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <ImageUpload
                    value=""
                    onChange={(url) => setImages([...images, { url, description: '' }])}
                    bucket="images"
                    folder="experiences"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
