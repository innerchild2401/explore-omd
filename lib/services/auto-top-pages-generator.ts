/**
 * Auto-Generated Top Pages Generator
 * 
 * Generates content for auto-generated ranking pages based on business data
 */

import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export interface BusinessRanking {
  business_id: string;
  business_name: string;
  business_slug: string;
  metric_value: number;
  rank: number;
}

export interface PageGenerationResult {
  success: boolean;
  businesses: BusinessRanking[];
  generatedAt: Date;
  error?: string;
}

/**
 * Generate rankings for a specific auto-top-page
 */
export async function generatePageContent(
  pageId: string,
  omdId: string
): Promise<PageGenerationResult> {
  const supabase = await createClient();

  try {
    // Get page configuration
    const { data: page, error: pageError } = await supabase
      .from('auto_top_pages')
      .select('*')
      .eq('id', pageId)
      .eq('omd_id', omdId)
      .single();

    if (pageError || !page) {
      return {
        success: false,
        businesses: [],
        generatedAt: new Date(),
        error: 'Page configuration not found',
      };
    }

    // Generate rankings based on page type
    let rankings: BusinessRanking[] = [];

    switch (page.page_type) {
      case 'most-booked-hotels':
        rankings = await generateMostBookedHotels(page, supabase);
        break;
      case 'cheapest-hotels':
        rankings = await generateCheapestHotels(page, supabase);
        break;
      case 'highest-rated-hotels':
        rankings = await generateHighestRatedHotels(page, supabase);
        break;
      case 'resorts':
      case 'bnb':
      case 'apartments':
        rankings = await generateHotelsByPropertyType(page, supabase);
        break;
      case '5-star-hotels':
      case '4-star-hotels':
        rankings = await generateHotelsByStarRating(page, supabase);
        break;
      case 'most-visited-restaurants':
        rankings = await generateMostVisitedRestaurants(page, supabase);
        break;
      case 'budget-restaurants':
      case 'mid-range-restaurants':
      case 'fine-dining-restaurants':
        rankings = await generateRestaurantsByPriceRange(page, supabase);
        break;
      case 'highest-rated-restaurants':
        rankings = await generateHighestRatedRestaurants(page, supabase);
        break;
      case 'most-booked-experiences':
        rankings = await generateMostBookedExperiences(page, supabase);
        break;
      case 'cheapest-experiences':
        rankings = await generateCheapestExperiences(page, supabase);
        break;
      case 'highest-rated-experiences':
        rankings = await generateHighestRatedExperiences(page, supabase);
        break;
      case 'easy-experiences':
      case 'moderate-experiences':
      case 'challenging-experiences':
        rankings = await generateExperiencesByDifficulty(page, supabase);
        break;
      case 'newest-businesses':
        rankings = await generateNewestBusinesses(page, supabase);
        break;
      default:
        return {
          success: false,
          businesses: [],
          generatedAt: new Date(),
          error: `Unknown page type: ${page.page_type}`,
        };
    }

    // Limit to requested count
    rankings = rankings.slice(0, page.count);

    // Save to cache (even if empty - this ensures we know the page was generated)
    await savePageContent(pageId, rankings, supabase);

    // Update last_generated_at - always update even if no results
    const { error: updateError } = await supabase
      .from('auto_top_pages')
      .update({ last_generated_at: new Date().toISOString() })
      .eq('id', pageId);

    if (updateError) {
      log.error('Error updating last_generated_at', updateError, { pageId });
      // Don't fail the whole operation, but log the error
    }

    return {
      success: true,
      businesses: rankings,
      generatedAt: new Date(),
    };
  } catch (error) {
    log.error('Error generating page content', error, { pageId, omdId });
    return {
      success: false,
      businesses: [],
      generatedAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate most booked hotels rankings
 */
async function generateMostBookedHotels(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  let query = supabase
    .from('reservations')
    .select('hotel_id, hotels!inner(business_id, businesses!inner(id, name, slug, omd_id, status, is_published))')
    .eq('hotels.businesses.omd_id', page.omd_id)
    .eq('hotels.businesses.status', 'active')
    .eq('hotels.businesses.is_published', true)
    .in('reservation_status', ['confirmed', 'checked_in', 'checked_out']);

  // Apply time period filter
  if (page.time_period === 'last-7-days') {
    query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  } else if (page.time_period === 'this-month') {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.gte('created_at', firstDay.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching hotel reservations', error);
    return [];
  }

  // Count reservations per hotel
  const counts: Record<string, { count: number; name: string; slug: string }> = {};
  
  data?.forEach((reservation: any) => {
    const businessId = reservation.hotels?.businesses?.id;
    if (businessId) {
      if (!counts[businessId]) {
        counts[businessId] = {
          count: 0,
          name: reservation.hotels.businesses.name,
          slug: reservation.hotels.businesses.slug,
        };
      }
      counts[businessId].count++;
    }
  });

  // Convert to rankings
  return Object.entries(counts)
    .map(([business_id, data]) => ({
      business_id,
      business_name: data.name,
      business_slug: data.slug,
      metric_value: data.count,
      rank: 0, // Will be set after sorting
    }))
    .sort((a, b) => b.metric_value - a.metric_value)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

/**
 * Generate cheapest hotels rankings
 */
async function generateCheapestHotels(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  // First, get all active hotels for this OMD
  const { data: businesses, error: businessesError } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('omd_id', page.omd_id)
    .eq('type', 'hotel')
    .eq('status', 'active')
    .eq('is_published', true);

  if (businessesError) {
    log.error('Error fetching businesses for cheapest ranking', businessesError);
    return [];
  }

  if (!businesses || businesses.length === 0) {
    log.info('No active hotels found for cheapest ranking', { omd_id: page.omd_id });
    return [];
  }

  // Get hotels for these businesses
  const businessIds = businesses.map((b: any) => b.id);
  const { data: hotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('id, business_id')
    .in('business_id', businessIds);

  if (hotelsError) {
    log.error('Error fetching hotels for cheapest ranking', hotelsError);
    return [];
  }

  if (!hotels || hotels.length === 0) {
    log.info('No hotels found for cheapest ranking', { businessIds });
    return [];
  }

  // Get active rooms for these hotels
  const hotelIds = hotels.map((h: any) => h.id);
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('hotel_id, base_price')
    .in('hotel_id', hotelIds)
    .eq('is_active', true)
    .not('base_price', 'is', null)
    .gt('base_price', 0);

  if (roomsError) {
    log.error('Error fetching rooms for cheapest ranking', roomsError);
    return [];
  }

  if (!rooms || rooms.length === 0) {
    log.info('No active rooms with prices found for cheapest ranking', { hotelIds });
    return [];
  }

  // Find minimum price per hotel, then map to business
  const hotelToBusiness = new Map(hotels.map((h: any) => [h.id, h.business_id]));
  const prices: Record<string, { price: number; name: string; slug: string }> = {};

  // Group rooms by hotel_id and find minimum price
  const roomsByHotel = rooms.reduce((acc: Record<string, number[]>, room: any) => {
    const hotelId = room.hotel_id as string;
    if (!acc[hotelId]) {
      acc[hotelId] = [];
    }
    acc[hotelId].push(parseFloat(room.base_price) || Infinity);
    return acc;
  }, {} as Record<string, number[]>);

  // Find minimum price per hotel and map to business
  Object.entries(roomsByHotel).forEach(([hotelId, pricesList]) => {
    const validPrices = (pricesList as number[]).filter((p: number) => p !== Infinity);
    if (validPrices.length > 0) {
      const minPrice = Math.min(...validPrices);
      if (minPrice !== Infinity) {
        const businessId = hotelToBusiness.get(hotelId) as string | undefined;
        if (businessId) {
          const business = businesses.find((b: any) => b.id === businessId);
          if (business) {
            // Keep the minimum price if we already have one for this business
            if (!prices[businessId] || prices[businessId].price > minPrice) {
              prices[businessId] = {
                price: minPrice,
                name: business.name,
                slug: business.slug,
              };
            }
          }
        }
      }
    }
  });

  if (Object.keys(prices).length === 0) {
    log.info('No hotels with valid prices found for cheapest ranking');
    return [];
  }

  return Object.entries(prices)
    .map(([business_id, data]) => ({
      business_id,
      business_name: data.name,
      business_slug: data.slug,
      metric_value: data.price,
      rank: 0,
    }))
    .sort((a, b) => a.metric_value - b.metric_value)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

/**
 * Generate highest rated hotels rankings
 */
async function generateHighestRatedHotels(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, rating')
    .eq('omd_id', page.omd_id)
    .eq('type', 'hotel')
    .eq('status', 'active')
    .eq('is_published', true)
    .gt('rating', 0)
    .order('rating', { ascending: false })
    .limit(page.count * 2); // Get extra in case some don't have ratings

  if (error) {
    log.error('Error fetching highest rated hotels', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: parseFloat(business.rating) || 0,
      rank: index + 1,
    }));
}

/**
 * Generate hotels by property type (resorts, B&B, apartments)
 */
async function generateHotelsByPropertyType(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const propertySubtype = page.filter_criteria?.property_subtype;
  if (!propertySubtype) return [];

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      rating,
      hotels!inner(property_subtype)
    `)
    .eq('omd_id', page.omd_id)
    .eq('type', 'hotel')
    .eq('status', 'active')
    .eq('is_published', true)
    .eq('hotels.property_subtype', propertySubtype)
    .order('rating', { ascending: false })
    .limit(page.count * 2);

  if (error) {
    log.error('Error fetching hotels by property type', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: parseFloat(business.rating) || 0,
      rank: index + 1,
    }));
}

/**
 * Generate hotels by star rating
 */
async function generateHotelsByStarRating(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const starRating = page.filter_criteria?.star_rating;
  if (!starRating) return [];

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      rating,
      hotels!inner(star_rating)
    `)
    .eq('omd_id', page.omd_id)
    .eq('type', 'hotel')
    .eq('status', 'active')
    .eq('is_published', true)
    .eq('hotels.star_rating', starRating)
    .order('rating', { ascending: false })
    .limit(page.count * 2);

  if (error) {
    log.error('Error fetching hotels by star rating', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: parseFloat(business.rating) || 0,
      rank: index + 1,
    }));
}

/**
 * Generate most visited restaurants rankings
 */
async function generateMostVisitedRestaurants(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  let query = supabase
    .from('restaurant_reservations')
    .select('restaurant_id, businesses!inner(id, name, slug, omd_id, status, is_published)')
    .eq('businesses.omd_id', page.omd_id)
    .eq('businesses.status', 'active')
    .eq('businesses.is_published', true)
    .in('status', ['confirmed', 'completed']);

  // Apply time period filter
  if (page.time_period === 'last-7-days') {
    query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  } else if (page.time_period === 'this-month') {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.gte('created_at', firstDay.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching restaurant reservations', error);
    return [];
  }

  // Count reservations per restaurant
  const counts: Record<string, { count: number; name: string; slug: string }> = {};
  
  data?.forEach((reservation: any) => {
    const businessId = reservation.businesses?.id;
    if (businessId) {
      if (!counts[businessId]) {
        counts[businessId] = {
          count: 0,
          name: reservation.businesses.name,
          slug: reservation.businesses.slug,
        };
      }
      counts[businessId].count++;
    }
  });

  return Object.entries(counts)
    .map(([business_id, data]) => ({
      business_id,
      business_name: data.name,
      business_slug: data.slug,
      metric_value: data.count,
      rank: 0,
    }))
    .sort((a, b) => b.metric_value - a.metric_value)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

/**
 * Generate restaurants by price range
 */
async function generateRestaurantsByPriceRange(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const priceRange = page.filter_criteria?.price_range;
  if (!priceRange) return [];

  const priceRanges = Array.isArray(priceRange) ? priceRange : [priceRange];

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      rating,
      restaurants!inner(price_range)
    `)
    .eq('omd_id', page.omd_id)
    .eq('type', 'restaurant')
    .eq('status', 'active')
    .eq('is_published', true)
    .in('restaurants.price_range', priceRanges)
    .order('rating', { ascending: false })
    .limit(page.count * 2);

  if (error) {
    log.error('Error fetching restaurants by price range', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: parseFloat(business.rating) || 0,
      rank: index + 1,
    }));
}

/**
 * Generate highest rated restaurants rankings
 */
async function generateHighestRatedRestaurants(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, rating')
    .eq('omd_id', page.omd_id)
    .eq('type', 'restaurant')
    .eq('status', 'active')
    .eq('is_published', true)
    .gt('rating', 0)
    .order('rating', { ascending: false })
    .limit(page.count * 2);

  if (error) {
    log.error('Error fetching highest rated restaurants', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: parseFloat(business.rating) || 0,
      rank: index + 1,
    }));
}

/**
 * Generate most booked experiences rankings
 */
async function generateMostBookedExperiences(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  let query = supabase
    .from('experience_bookings')
    .select('experience_id, experiences!inner(business_id, businesses!inner(id, name, slug, omd_id, status, is_published))')
    .eq('experiences.businesses.omd_id', page.omd_id)
    .eq('experiences.businesses.status', 'active')
    .eq('experiences.businesses.is_published', true)
    .in('status', ['confirmed', 'completed']);

  // Apply time period filter
  if (page.time_period === 'last-7-days') {
    query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  } else if (page.time_period === 'this-month') {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.gte('created_at', firstDay.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching experience bookings', error);
    return [];
  }

  // Count bookings per experience
  const counts: Record<string, { count: number; name: string; slug: string }> = {};
  
  data?.forEach((booking: any) => {
    const businessId = booking.experiences?.businesses?.id;
    if (businessId) {
      if (!counts[businessId]) {
        counts[businessId] = {
          count: 0,
          name: booking.experiences.businesses.name,
          slug: booking.experiences.businesses.slug,
        };
      }
      counts[businessId].count++;
    }
  });

  return Object.entries(counts)
    .map(([business_id, data]) => ({
      business_id,
      business_name: data.name,
      business_slug: data.slug,
      metric_value: data.count,
      rank: 0,
    }))
    .sort((a, b) => b.metric_value - a.metric_value)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

/**
 * Generate cheapest experiences rankings
 */
async function generateCheapestExperiences(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      experiences!inner(price_from)
    `)
    .eq('omd_id', page.omd_id)
    .eq('type', 'experience')
    .eq('status', 'active')
    .eq('is_published', true)
    .not('experiences.price_from', 'is', null)
    .order('experiences.price_from', { ascending: true })
    .limit(page.count * 2);

  if (error) {
    log.error('Error fetching cheapest experiences', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: parseFloat(business.experiences?.[0]?.price_from) || 0,
      rank: index + 1,
    }));
}

/**
 * Generate highest rated experiences rankings
 */
async function generateHighestRatedExperiences(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, rating')
    .eq('omd_id', page.omd_id)
    .eq('type', 'experience')
    .eq('status', 'active')
    .eq('is_published', true)
    .gt('rating', 0)
    .order('rating', { ascending: false })
    .limit(page.count * 2);

  if (error) {
    log.error('Error fetching highest rated experiences', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: parseFloat(business.rating) || 0,
      rank: index + 1,
    }));
}

/**
 * Generate experiences by difficulty level
 */
async function generateExperiencesByDifficulty(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const difficultyLevel = page.filter_criteria?.difficulty_level;
  if (!difficultyLevel) return [];

  const levels = Array.isArray(difficultyLevel) ? difficultyLevel : [difficultyLevel];

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      rating,
      experiences!inner(difficulty_level)
    `)
    .eq('omd_id', page.omd_id)
    .eq('type', 'experience')
    .eq('status', 'active')
    .eq('is_published', true)
    .in('experiences.difficulty_level', levels)
    .order('rating', { ascending: false })
    .limit(page.count * 2);

  if (error) {
    log.error('Error fetching experiences by difficulty', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: parseFloat(business.rating) || 0,
      rank: index + 1,
    }));
}

/**
 * Generate newest businesses rankings
 */
async function generateNewestBusinesses(
  page: any,
  supabase: any
): Promise<BusinessRanking[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, slug, created_at')
    .eq('omd_id', page.omd_id)
    .eq('status', 'active')
    .eq('is_published', true)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    .order('created_at', { ascending: false })
    .limit(page.count * 2);

  if (error) {
    log.error('Error fetching newest businesses', error);
    return [];
  }

  return (data || [])
    .map((business: any, index: number) => ({
      business_id: business.id,
      business_name: business.name,
      business_slug: business.slug,
      metric_value: new Date(business.created_at).getTime(),
      rank: index + 1,
    }));
}

/**
 * Save generated content to cache
 */
async function savePageContent(
  pageId: string,
  rankings: BusinessRanking[],
  supabase: any
): Promise<void> {
  // Delete old content
  await supabase
    .from('auto_top_page_content')
    .delete()
    .eq('auto_top_page_id', pageId);

  // Insert new content
  if (rankings.length > 0) {
    const content = rankings.map((ranking) => ({
      auto_top_page_id: pageId,
      business_id: ranking.business_id,
      rank: ranking.rank,
      metric_value: ranking.metric_value,
    }));

    const { error } = await supabase
      .from('auto_top_page_content')
      .insert(content);

    if (error) {
      log.error('Error saving page content', error, { pageId });
    }
  }
}

