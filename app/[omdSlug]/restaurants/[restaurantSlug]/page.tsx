import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TrackPageView from '@/components/analytics/TrackPageView';
import Link from 'next/link';
import ContactLink from '@/components/analytics/ContactLink';
import RestaurantImageGallery from '@/components/restaurants/RestaurantImageGallery';

interface RestaurantPageProps {
  params: {
    omdSlug: string;
    restaurantSlug: string;
  };
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const supabase = await createClient();
  
  // Await params for Next.js 15 compatibility
  const { omdSlug, restaurantSlug } = await params;

  // Get OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('*')
    .eq('slug', omdSlug)
    .single();

  if (!omd) {
    notFound();
  }

  // Get restaurant with business info
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select(`
      *,
      businesses!inner(
        id,
        name,
        description,
        slug,
        images,
        contact,
        location
      )
    `)
    .eq('businesses.slug', restaurantSlug)
    .eq('businesses.omd_id', omd.id)
    .eq('businesses.status', 'active')
    .single();

  if (restaurantError) {
    console.error('Restaurant query error:', restaurantError);
  }

  if (!restaurant) {
    console.log('No restaurant found for slug:', restaurantSlug, 'in OMD:', omd.id);
    notFound();
  }

  // Get menu items
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant.businesses.id)
    .eq('available', true)
    .order('category')
    .order('order_index');

  const business = restaurant.businesses;

  // Group menu items by category
  const groupedMenuItems = menuItems?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden" style={{ maxWidth: '100vw', boxSizing: 'border-box' as const }}>
      <TrackPageView businessId={business.id} eventType="detail_view" />
      {/* Header */}
      <header className="bg-white shadow-sm w-full">
        <div className="mx-auto max-w-7xl px-4 py-6 w-full min-w-0">
          <Link href={`/${omdSlug}/restaurants`} className="text-blue-600 hover:text-blue-700 break-words inline-block">
            ← Back to Restaurants
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 break-words">{business.name}</h1>
          <p className="mt-1 text-gray-600 break-words">{business.description}</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 w-full min-w-0" style={{ maxWidth: '100%', boxSizing: 'border-box' as const }}>
        <div className="grid gap-8 lg:grid-cols-3 w-full min-w-0">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 min-w-0">
            {/* Restaurant Images */}
            <RestaurantImageGallery 
              images={business.images || []} 
              restaurantName={business.name}
            />

            {/* Restaurant Info */}
            <div className="rounded-lg bg-white p-6 shadow border border-gray-200 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About {business.name}</h2>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Cuisine</h3>
                  <p className="text-gray-600">{restaurant.cuisine_type}</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Price Range</h3>
                  <p className="text-gray-600">{restaurant.price_range}</p>
                </div>
                
                {restaurant.seating_capacity && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Seating Capacity</h3>
                    <p className="text-gray-600">{restaurant.seating_capacity} people</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Services</h3>
                  <div className="space-y-1">
                    {restaurant.accepts_reservations && (
                      <p className="text-gray-600">✓ Reservations accepted</p>
                    )}
                    {restaurant.delivery_available && (
                      <p className="text-gray-600">✓ Delivery available</p>
                    )}
                    {restaurant.takeaway_available && (
                      <p className="text-gray-600">✓ Takeaway available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu */}
            {Object.keys(groupedMenuItems).length > 0 && (
              <div className="rounded-lg bg-white shadow border border-gray-200 min-w-0">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Menu</h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {Object.entries(groupedMenuItems).map(([category, items]) => (
                    <div key={category} className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
                      
                      <div className="space-y-4">
                        {(items as any[]).map((item: any) => (
                          <div key={item.id} className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                {item.allergens && item.allergens.length > 0 && (
                                  <div className="flex space-x-1">
                                    {item.allergens.map((allergen: any) => (
                                      <span key={allergen} className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded">
                                        {allergen}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {item.description && (
                                <p className="mt-1 text-gray-600">{item.description}</p>
                              )}
                            </div>
                            
                            <div className="ml-4">
                              <span className="text-lg font-semibold text-gray-900">
                                ${item.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 min-w-0">
            {/* Contact & Location */}
            <div className="rounded-lg bg-white p-6 shadow border border-gray-200 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact & Location</h3>
              
              <div className="space-y-3">
                {business.contact?.phone && (
                  <div>
                    <h4 className="font-medium text-gray-900">Phone</h4>
                    <ContactLink 
                      businessId={business.id}
                      type="phone"
                      value={business.contact.phone}
                      className="text-blue-600 hover:text-blue-700"
                    />
                  </div>
                )}
                
                {business.contact?.email && (
                  <div>
                    <h4 className="font-medium text-gray-900">Email</h4>
                    <ContactLink 
                      businessId={business.id}
                      type="email"
                      value={business.contact.email}
                      className="text-blue-600 hover:text-blue-700"
                    />
                  </div>
                )}
                
                {business.contact?.website && (
                  <div>
                    <h4 className="font-medium text-gray-900">Website</h4>
                    <a 
                      href={business.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
                
                {business.location?.address && (
                  <div>
                    <h4 className="font-medium text-gray-900">Address</h4>
                    <p className="text-gray-600">{business.location.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reservations */}
            {restaurant.accepts_reservations && (
              <div className="rounded-lg bg-blue-50 p-6 border border-blue-200 min-w-0">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Make a Reservation</h3>
                <p className="text-blue-800 mb-4">
                  Call us to make a reservation
                </p>
                {business.contact?.phone && (
                  <ContactLink
                    businessId={business.id}
                    type="phone"
                    value={business.contact.phone}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                  >
                    📞 Call {business.contact.phone}
                  </ContactLink>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
