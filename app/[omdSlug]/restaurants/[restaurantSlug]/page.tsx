import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TrackPageView from '@/components/analytics/TrackPageView';
import ContactLink from '@/components/analytics/ContactLink';
import RestaurantImageGallery from '@/components/restaurants/RestaurantImageGallery';
import BackButton from '@/components/ui/BackButton';
import TopPagesSection from '@/components/business/TopPagesSection';
import LandingPagesSection from '@/components/business/LandingPagesSection';
import { formatPrice } from '@/lib/utils';

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
    .select('id, name, slug, status')
    .eq('slug', omdSlug)
    .single();

  if (!omd || omd.status !== 'active') {
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
    .eq('businesses.is_published', true)
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

  const { data: menuCategories } = await supabase
    .from('menu_categories')
    .select('id, name, display_order, is_active')
    .eq('restaurant_id', restaurant.id)
    .order('display_order');

  const business = restaurant.businesses;

  // Group menu items by category
  const groupedMenuItems =
    menuItems?.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, any[]>) || {};

  const orderedMenuSections = (() => {
    const sections: { name: string; items: any[] }[] = [];
    const activeCategories =
      menuCategories
        ?.filter((cat) => cat.is_active ?? true)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((cat) => cat.name) || [];

    activeCategories.forEach((name) => {
      if (groupedMenuItems[name]?.length) {
        sections.push({ name, items: groupedMenuItems[name] });
      }
    });

    const remaining = Object.entries(groupedMenuItems)
      .filter(([name]) => !activeCategories.includes(name))
      .sort((a, b) => a[0].localeCompare(b[0]));

    remaining.forEach(([name, items]) => {
      const sectionItems = items as any[];
      if (sectionItems.length) {
        sections.push({ name, items: sectionItems });
      }
    });

    return sections;
  })();

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden" style={{ maxWidth: '100vw', boxSizing: 'border-box' as const }}>
      <TrackPageView businessId={business.id} eventType="detail_view" />
      {/* Header */}
      <header className="bg-white shadow-sm w-full">
        <div className="mx-auto max-w-7xl px-4 py-6 w-full min-w-0">
          <div className="mb-4">
            <BackButton href={`/${omdSlug}/restaurants`} label="Back to Restaurants" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 break-words">{business.name}</h1>
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
            {orderedMenuSections.length > 0 && (
              <div className="rounded-2xl bg-white shadow border border-gray-200 min-w-0">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Menu</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Expand a section to discover dishes, descriptions, and allergens.
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {orderedMenuSections.map(({ name, items }) => (
                    <details key={name} className="group">
                      <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-left text-lg font-semibold text-gray-900 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
                        <span className="capitalize break-words">{name}</span>
                        <span className="ml-4 flex items-center gap-2 text-sm font-normal text-gray-500">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                          <svg
                            className="h-5 w-5 text-gray-400 transition group-open:rotate-180"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </summary>

                      <div className="px-6 pb-6 pt-2 space-y-6">
                        {items.map((item: any) => (
                          <div
                            key={item.id ?? `${name}-${item.name}`}
                            className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                              <h4 className="text-lg font-semibold text-gray-900 break-words">{item.name}</h4>
                              {typeof item.price !== 'undefined' && (
                                <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {formatPrice(Number(item.price) || 0, 'RON')}
                                </span>
                              )}
                            </div>

                            {item.description && (
                              <p className="mt-2 text-sm leading-relaxed text-gray-600 break-words">
                                {item.description}
                              </p>
                            )}

                            {item.allergens && item.allergens.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {item.allergens.map((allergen: any) => (
                                  <span
                                    key={allergen}
                                    className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800"
                                  >
                                    Contains {allergen}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
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

        {/* Top Pages Section - Internal Linking */}
        <TopPagesSection
          omdSlug={omdSlug}
          omdName={omd.name}
          businessId={business.id}
          businessType="restaurant"
        />

        {/* Landing Pages Section - Internal Linking */}
        <LandingPagesSection
          omdSlug={omdSlug}
          businessId={business.id}
        />
      </main>
    </div>
  );
}
