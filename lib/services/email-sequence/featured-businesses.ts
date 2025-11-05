import { createClient } from '@/lib/supabase/server';

interface FeaturedBusiness {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  type: 'restaurant' | 'experience';
  rating: number;
}

/**
 * Get featured businesses for email recommendations
 * Returns 3 restaurants and 3 experiences, either explicitly set by admin or randomized
 */
export async function getFeaturedBusinessesForEmail(omdId: string): Promise<{
  restaurants: FeaturedBusiness[];
  experiences: FeaturedBusiness[];
}> {
  const supabase = await createClient();

  // Get featured restaurants (explicitly set by admin)
  const { data: featuredRestaurants } = await supabase
    .from('businesses')
    .select('id, name, slug, description, images, rating, email_featured_order')
    .eq('omd_id', omdId)
    .eq('type', 'restaurant')
    .eq('status', 'active')
    .eq('is_featured_for_emails', true)
    .order('email_featured_order', { ascending: true, nullsFirst: false })
    .limit(3);

  // Get featured experiences (explicitly set by admin)
  const { data: featuredExperiences } = await supabase
    .from('businesses')
    .select('id, name, slug, description, images, rating, email_featured_order')
    .eq('omd_id', omdId)
    .eq('type', 'experience')
    .eq('status', 'active')
    .eq('is_featured_for_emails', true)
    .order('email_featured_order', { ascending: true, nullsFirst: false })
    .limit(3);

  const restaurants: FeaturedBusiness[] = [];
  const experiences: FeaturedBusiness[] = [];

  // Add featured restaurants
  if (featuredRestaurants && featuredRestaurants.length > 0) {
    restaurants.push(
      ...featuredRestaurants.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description,
        images: b.images || [],
        type: 'restaurant' as const,
        rating: b.rating || 0,
      }))
    );
  }

  // If we need more restaurants (less than 3 featured), get random ones
  if (restaurants.length < 3) {
    const featuredIds = new Set(restaurants.map((r) => r.id));
    
    // Get all active restaurants, then filter out featured ones
    const { data: allRestaurants } = await supabase
      .from('businesses')
      .select('id, name, slug, description, images, rating')
      .eq('omd_id', omdId)
      .eq('type', 'restaurant')
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .limit(20); // Get more to randomize from

    if (allRestaurants && allRestaurants.length > 0) {
      // Filter out featured restaurants and randomize
      const available = allRestaurants.filter((b) => !featuredIds.has(b.id));
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      
      restaurants.push(
        ...shuffled.slice(0, 3 - restaurants.length).map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          description: b.description,
          images: b.images || [],
          type: 'restaurant' as const,
          rating: b.rating || 0,
        }))
      );
    }
  }

  // Add featured experiences
  if (featuredExperiences && featuredExperiences.length > 0) {
    experiences.push(
      ...featuredExperiences.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description,
        images: b.images || [],
        type: 'experience' as const,
        rating: b.rating || 0,
      }))
    );
  }

  // If we need more experiences (less than 3 featured), get random ones
  if (experiences.length < 3) {
    const featuredIds = new Set(experiences.map((e) => e.id));
    
    // Get all active experiences, then filter out featured ones
    const { data: allExperiences } = await supabase
      .from('businesses')
      .select('id, name, slug, description, images, rating')
      .eq('omd_id', omdId)
      .eq('type', 'experience')
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .limit(20); // Get more to randomize from

    if (allExperiences && allExperiences.length > 0) {
      // Filter out featured experiences and randomize
      const available = allExperiences.filter((b) => !featuredIds.has(b.id));
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      
      experiences.push(
        ...shuffled.slice(0, 3 - experiences.length).map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          description: b.description,
          images: b.images || [],
          type: 'experience' as const,
          rating: b.rating || 0,
        }))
      );
    }
  }

  return {
    restaurants: restaurants.slice(0, 3), // Ensure max 3
    experiences: experiences.slice(0, 3), // Ensure max 3
  };
}

