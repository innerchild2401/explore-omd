import type { Business } from '@/types';

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Sort businesses according to featured ordering rules:
 * 1. Featured businesses (featured_order 1, 2, 3) - in order
 * 2. Remaining OMD members (random)
 * 3. Non-members (random)
 */
export function sortBusinessesByFeaturedOrder<T extends { businesses?: { featured_order?: number | null; is_omd_member?: boolean } } | { featured_order?: number | null; is_omd_member?: boolean }>(
  items: T[]
): T[] {
  const featured: T[] = [];
  const remainingMembers: T[] = [];
  const nonMembers: T[] = [];

  for (const item of items) {
    // Handle nested businesses structure (from hotels/restaurants/experiences pages)
    const business = 'businesses' in item ? item.businesses : (item as { featured_order?: number | null; is_omd_member?: boolean });
    const featuredOrder = business?.featured_order;
    const isMember = business?.is_omd_member;

    if (featuredOrder !== null && featuredOrder !== undefined && featuredOrder >= 1 && featuredOrder <= 3) {
      featured.push(item);
    } else if (isMember === true) {
      remainingMembers.push(item);
    } else {
      nonMembers.push(item);
    }
  }

  // Sort featured businesses by featured_order (1, 2, 3)
  featured.sort((a, b) => {
    const aBusiness = 'businesses' in a ? a.businesses : (a as { featured_order?: number | null; is_omd_member?: boolean });
    const bBusiness = 'businesses' in b ? b.businesses : (b as { featured_order?: number | null; is_omd_member?: boolean });
    const aOrder = aBusiness?.featured_order || 0;
    const bOrder = bBusiness?.featured_order || 0;
    return aOrder - bOrder;
  });

  // Shuffle remaining members and non-members
  const shuffledMembers = shuffleArray(remainingMembers);
  const shuffledNonMembers = shuffleArray(nonMembers);

  // Combine: featured first, then shuffled members, then shuffled non-members
  return [...featured, ...shuffledMembers, ...shuffledNonMembers];
}

