'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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

interface Restaurant {
  id: string;
  business_id: string;
  cuisine_type: string;
  price_range: string;
  seating_capacity: number;
  accepts_reservations: boolean;
  delivery_available: boolean;
  takeaway_available: boolean;
  opening_hours: any;
}

interface RestaurantBasicInfoProps {
  business: Business;
  restaurant: Restaurant;
  onUpdate: () => void;
}

export default function RestaurantBasicInfo({
  business,
  restaurant,
  onUpdate,
}: RestaurantBasicInfoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Business fields
    name: business.name || '',
    description: business.description || '',
    phone: business.contact?.phone || '',
    email: business.contact?.email || '',
    website: business.contact?.website || '',
    address: business.location?.address || '',
    
    // Restaurant fields
    cuisine_type: restaurant.cuisine_type || '',
    price_range: restaurant.price_range || '',
    seating_capacity: restaurant.seating_capacity || '',
    accepts_reservations: restaurant.accepts_reservations || false,
    delivery_available: restaurant.delivery_available || false,
    takeaway_available: restaurant.takeaway_available || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = await createClient();

      // Update business information
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          name: formData.name,
          description: formData.description,
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

      if (businessError) throw businessError;

      // Update restaurant information
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update({
          cuisine_type: formData.cuisine_type,
          price_range: formData.price_range,
          seating_capacity: formData.seating_capacity ? parseInt(formData.seating_capacity.toString()) : null,
          accepts_reservations: formData.accepts_reservations,
          delivery_available: formData.delivery_available,
          takeaway_available: formData.takeaway_available,
        })
        .eq('id', restaurant.id);

      if (restaurantError) throw restaurantError;

      onUpdate();
    } catch (error) {
      console.error('Error updating restaurant:', error);
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

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Restaurant Information</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Name *
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
                <label htmlFor="cuisine_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Cuisine Type *
                </label>
                <input
                  type="text"
                  id="cuisine_type"
                  name="cuisine_type"
                  value={formData.cuisine_type}
                  onChange={handleInputChange}
                  placeholder="e.g., Italian, Mexican, Asian Fusion"
                  required
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
                rows={3}
                placeholder="Describe your restaurant, atmosphere, and specialties..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Restaurant Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Restaurant Details</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="price_range" className="block text-sm font-medium text-gray-700 mb-1">
                  Price Range *
                </label>
                <select
                  id="price_range"
                  name="price_range"
                  value={formData.price_range}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Select price range</option>
                  <option value="$">$ - Budget friendly</option>
                  <option value="$$">$$ - Moderate</option>
                  <option value="$$$">$$$ - Expensive</option>
                  <option value="$$$$">$$$$ - Very expensive</option>
                </select>
              </div>

              <div>
                <label htmlFor="seating_capacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Seating Capacity
                </label>
                <input
                  type="number"
                  id="seating_capacity"
                  name="seating_capacity"
                  value={formData.seating_capacity}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>
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
                <p className="mt-1 text-sm text-gray-600">
                  This will be displayed for reservations
                </p>
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
                  placeholder="e.g., info@restaurant.com"
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
                  placeholder="e.g., https://restaurant.com"
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
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Services</h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="accepts_reservations"
                  checked={formData.accepts_reservations}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Accepts reservations (customers will call to book)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="delivery_available"
                  checked={formData.delivery_available}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Delivery available
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="takeaway_available"
                  checked={formData.takeaway_available}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Takeaway available
                </span>
              </label>
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
