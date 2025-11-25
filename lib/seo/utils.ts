/**
 * SEO Utility Functions
 * 
 * Centralized utilities for generating SEO metadata, structured data,
 * and canonical URLs across the application.
 */

import { Metadata } from 'next';
import { env } from '@/lib/env';

/**
 * Get the base URL for the site
 */
export function getBaseUrl(): string {
  if (env.NEXT_PUBLIC_SITE_URL && typeof env.NEXT_PUBLIC_SITE_URL === 'string') {
    return String(env.NEXT_PUBLIC_SITE_URL).trim();
  }
  
  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Production fallback
  return 'https://destexplore.eu';
}

/**
 * Generate absolute URL from path
 */
export function getAbsoluteUrl(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') {
    return getBaseUrl();
  }
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Generate Open Graph image URL
 * Falls back to a default OG image if none provided
 */
export function getOgImageUrl(imagePath?: string | null, title?: string): string {
  if (imagePath && typeof imagePath === 'string' && imagePath.trim()) {
    // If it's already a full URL, return it
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    // Otherwise, make it absolute
    return getAbsoluteUrl(imagePath);
  }
  
  // Generate a default OG image URL (you can create a dynamic OG image API route later)
  // For now, return a placeholder or default image
  return getAbsoluteUrl('/og-default.jpg');
}

/**
 * Generate comprehensive metadata with Open Graph and Twitter Cards
 */
export function generateSeoMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  locale = 'ro_RO',
  siteName,
  publishedTime,
  modifiedTime,
  authors,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  locale?: string;
  siteName?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}): Metadata {
  const safePath = typeof path === 'string' ? path : '/';
  const url = getAbsoluteUrl(safePath);
  const ogImage = getOgImageUrl(image, title);
  const defaultSiteName = siteName || 'Dest Explore';

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: defaultSiteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale,
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(authors && authors.length > 0 && { authors }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  return metadata;
}

/**
 * Generate structured data for Organization
 */
export function generateOrganizationSchema(omd: {
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
}) {
  const baseUrl = getBaseUrl();
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: omd.name,
    url: `${baseUrl}/${omd.slug}`,
    ...(omd.logo && typeof omd.logo === 'string' && {
      logo: omd.logo.startsWith('http') ? omd.logo : getAbsoluteUrl(omd.logo),
    }),
    ...(omd.description && { description: omd.description }),
  };
}

/**
 * Generate structured data for Hotel
 */
export function generateHotelSchema(hotel: {
  name: string;
  description?: string | null;
  url: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  } | null;
  rating?: number | null;
  starRating?: number | null;
  priceRange?: string | null;
  images?: string[] | null;
  phone?: string | null;
  email?: string | null;
}) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    url: hotel.url,
    ...(hotel.description && { description: hotel.description }),
    ...(hotel.rating && hotel.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: hotel.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(hotel.starRating && {
      starRating: {
        '@type': 'Rating',
        ratingValue: hotel.starRating,
      },
    }),
    ...(hotel.priceRange && { priceRange: hotel.priceRange }),
    ...(hotel.images && hotel.images.length > 0 && {
      image: hotel.images
        .filter((img): img is string => typeof img === 'string' && Boolean(img))
        .slice(0, 5)
        .map((img) =>
          img.startsWith('http') ? img : getAbsoluteUrl(img)
        ),
    }),
  };

  // Address
  if (hotel.address) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(hotel.address.street && { streetAddress: hotel.address.street }),
      ...(hotel.address.city && { addressLocality: hotel.address.city }),
      ...(hotel.address.region && { addressRegion: hotel.address.region }),
      ...(hotel.address.postalCode && { postalCode: hotel.address.postalCode }),
      ...(hotel.address.country && { addressCountry: hotel.address.country }),
    };
  }

  // Contact
  if (hotel.phone || hotel.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      ...(hotel.phone && { telephone: hotel.phone }),
      ...(hotel.email && { email: hotel.email }),
      contactType: 'customer service',
    };
  }

  return schema;
}

/**
 * Generate structured data for Restaurant
 */
export function generateRestaurantSchema(restaurant: {
  name: string;
  description?: string | null;
  url: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  } | null;
  rating?: number | null;
  priceRange?: string | null;
  cuisineType?: string | null;
  images?: string[] | null;
  phone?: string | null;
  email?: string | null;
}) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    url: restaurant.url,
    ...(restaurant.description && { description: restaurant.description }),
    ...(restaurant.rating && restaurant.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: restaurant.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(restaurant.priceRange && { priceRange: restaurant.priceRange }),
    ...(restaurant.cuisineType && { servesCuisine: restaurant.cuisineType }),
    ...(restaurant.images && restaurant.images.length > 0 && {
      image: restaurant.images
        .filter((img): img is string => typeof img === 'string' && Boolean(img))
        .slice(0, 5)
        .map((img) =>
          img.startsWith('http') ? img : getAbsoluteUrl(img)
        ),
    }),
  };

  // Address
  if (restaurant.address) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(restaurant.address.street && { streetAddress: restaurant.address.street }),
      ...(restaurant.address.city && { addressLocality: restaurant.address.city }),
      ...(restaurant.address.region && { addressRegion: restaurant.address.region }),
      ...(restaurant.address.postalCode && { postalCode: restaurant.address.postalCode }),
      ...(restaurant.address.country && { addressCountry: restaurant.address.country }),
    };
  }

  // Contact
  if (restaurant.phone || restaurant.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      ...(restaurant.phone && { telephone: restaurant.phone }),
      ...(restaurant.email && { email: restaurant.email }),
      contactType: 'customer service',
    };
  }

  return schema;
}

/**
 * Generate structured data for Tourist Attraction / Experience
 */
export function generateExperienceSchema(experience: {
  name: string;
  description?: string | null;
  url: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  } | null;
  rating?: number | null;
  priceFrom?: number | null;
  category?: string | null;
  images?: string[] | null;
  phone?: string | null;
  email?: string | null;
}) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: experience.name,
    url: experience.url,
    ...(experience.description && { description: experience.description }),
    ...(experience.rating && experience.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: experience.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(experience.category && { category: experience.category }),
    ...(experience.images && experience.images.length > 0 && {
      image: experience.images
        .filter((img): img is string => typeof img === 'string' && Boolean(img))
        .slice(0, 5)
        .map((img) =>
          img.startsWith('http') ? img : getAbsoluteUrl(img)
        ),
    }),
  };

  // Address
  if (experience.address) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(experience.address.street && { streetAddress: experience.address.street }),
      ...(experience.address.city && { addressLocality: experience.address.city }),
      ...(experience.address.region && { addressRegion: experience.address.region }),
      ...(experience.address.postalCode && { postalCode: experience.address.postalCode }),
      ...(experience.address.country && { addressCountry: experience.address.country }),
    };
  }

  // Contact
  if (experience.phone || experience.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      ...(experience.phone && { telephone: experience.phone }),
      ...(experience.email && { email: experience.email }),
      contactType: 'customer service',
    };
  }

  // Price
  if (experience.priceFrom) {
    schema.offers = {
      '@type': 'Offer',
      price: experience.priceFrom,
      priceCurrency: 'RON',
      availability: 'https://schema.org/InStock',
    };
  }

  return schema;
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate CollectionPage structured data for landing pages
 */
export function generateCollectionPageSchema({
  name,
  description,
  url,
  items,
}: {
  name: string;
  description?: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    ...(description && { description }),
    url,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Thing',
          name: item.name,
          url: item.url,
        },
      })),
    },
  };
}

