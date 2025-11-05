import { createClient } from './server';
import type { OMD, Section, Business } from '@/types';

// ============================================
// OMD QUERIES
// ============================================

export async function getOMDBySlug(slug: string): Promise<OMD | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('omds')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching OMD:', error);
    return null;
  }

  return data as OMD;
}

export async function getAllOMDs(): Promise<OMD[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('omds')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching OMDs:', error);
    return [];
  }

  return data as OMD[];
}

// ============================================
// SECTION QUERIES
// ============================================

export async function getSectionsByOMD(omdId: string, includeHidden = false): Promise<Section[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('sections')
    .select('*')
    .eq('omd_id', omdId)
    .order('order_index');

  if (!includeHidden) {
    query = query.eq('is_visible', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sections:', error);
    return [];
  }

  return data as Section[];
}

export async function getSectionByType(omdId: string, type: string): Promise<Section | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('omd_id', omdId)
    .eq('type', type)
    .eq('is_visible', true)
    .single();

  if (error) {
    console.error('Error fetching section:', error);
    return null;
  }

  return data as Section;
}

// ============================================
// BUSINESS QUERIES
// ============================================

export async function getBusinessesByOMD(
  omdId: string,
  type?: 'hotel' | 'restaurant' | 'experience',
  limit?: number
): Promise<Business[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('businesses')
    .select('*')
    .eq('omd_id', omdId)
    .eq('status', 'active');

  if (type) {
    query = query.eq('type', type);
  }

  if (limit) {
    query = query.limit(limit);
  }

  // Sort by OMD member status first, then by rating
  query = query.order('is_omd_member', { ascending: false, nullsFirst: false });
  query = query.order('rating', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching businesses:', error);
    return [];
  }

  return data as Business[];
}

export async function getBusinessBySlug(omdId: string, slug: string): Promise<Business | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('omd_id', omdId)
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error) {
    console.error('Error fetching business:', error);
    return null;
  }

  return data as Business;
}

// ============================================
// TRANSLATION QUERIES
// ============================================

export async function getTranslation(
  entityType: string,
  entityId: string,
  language: string
): Promise<Record<string, any> | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('translations')
    .select('content')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('language', language)
    .single();

  if (error) {
    return null;
  }

  return data?.content || null;
}

// ============================================
// HOTEL QUERIES
// ============================================

export async function getRoomsByHotel(hotelId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_available', true)
    .order('price_per_night');

  if (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }

  return data;
}

// ============================================
// RESTAURANT QUERIES
// ============================================

export async function getMenuItemsByRestaurant(restaurantId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('available', true)
    .order('category')
    .order('order_index');

  if (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }

  return data;
}

// ============================================
// EXPERIENCE QUERIES
// ============================================

export async function getExperienceAvailability(
  experienceId: string,
  fromDate?: string,
  toDate?: string
) {
  const supabase = await createClient();
  
  let query = supabase
    .from('experience_availability')
    .select('*')
    .eq('experience_id', experienceId)
    .eq('is_available', true)
    .gte('booked', 0);

  if (fromDate) {
    query = query.gte('date', fromDate);
  }

  if (toDate) {
    query = query.lte('date', toDate);
  }

  query = query.order('date').order('time_slot');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching availability:', error);
    return [];
  }

  return data;
}

// ============================================
// REVIEW QUERIES
// ============================================

export async function getReviewsByBusiness(businessId: string, limit = 10) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }

  return data;
}

