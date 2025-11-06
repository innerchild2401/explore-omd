'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Section, Business } from '@/types';
import { getImageUrl, formatPrice, getStarRating } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import OmdMemberBadge from '@/components/ui/OmdMemberBadge';

interface BusinessCarouselProps {
  section: Section;
  businesses: Business[];
  omdSlug: string;
  type: 'hotel' | 'restaurant' | 'experience';
}

export default function BusinessCarousel({
  section,
  businesses,
  omdSlug,
  type,
}: BusinessCarouselProps) {
  const { title, subtitle } = section.content;

  const getTypeIcon = () => {
    switch (type) {
      case 'hotel':
        return (
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'restaurant':
        return (
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'experience':
        return (
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        );
    }
  };

  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-3 flex justify-center text-blue-600">{getTypeIcon()}</div>
            <h2 className="mb-2 text-4xl font-bold text-gray-900">
              {title || `Where to ${type === 'hotel' ? 'Stay' : type === 'restaurant' ? 'Eat' : 'Explore'}`}
            </h2>
            {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
          </motion.div>
        </div>

        {/* Carousel */}
        <div className="overflow-x-auto">
          <div className="flex space-x-6 pb-4">
            {businesses.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex-shrink-0"
                style={{ pointerEvents: 'auto' }}
              >
                <Link 
                  href={`/${omdSlug}/${type}s/${business.slug}`}
                  className="block touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                  prefetch={true}
                >
                  <div className="group w-80 overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow hover:shadow-xl">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <OptimizedImage
                        src={getImageUrl(
                          typeof business.images[0] === 'string' 
                            ? business.images[0] 
                            : (business.images[0] as any)?.url
                        )}
                        alt={business.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={index < 3} // Prioritize first 3 images
                      />
                      <div className="absolute right-2 top-2 flex flex-col items-end gap-2">
                        {business.is_omd_member && (
                          <OmdMemberBadge size="sm" />
                        )}
                        {business.rating > 0 && (
                          <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-md text-gray-900">
                            {business.rating} ⭐
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="mb-2">
                        <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
                          {business.name}
                        </h3>
                        {/* Area Badge - Subtle */}
                        {business.area_id && business.areas && (
                          <div className="mt-1.5 inline-flex items-center text-xs text-gray-500">
                            <svg className="h-3 w-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">{(business.areas as any).name || business.area_id}</span>
                          </div>
                        )}
                      </div>
                      <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                        {business.description}
                      </p>

                      {/* Location */}
                      {business.location?.address && (
                        <div className="mb-3 flex items-center text-sm text-gray-500">
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          <span className="line-clamp-1">{business.location.address}</span>
                        </div>
                      )}

                      {/* CTA */}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          View Details
                        </span>
                        <svg
                          className="h-6 w-6 text-blue-600 transition-transform group-hover:translate-x-1"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M9 5l7 7-7 7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* View All Link */}
        <div className="mt-8 text-center">
          <Link
            href={`/${omdSlug}/${type}s`}
            className="inline-flex items-center text-lg font-semibold text-blue-600 hover:underline touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            View All {type === 'hotel' ? 'Hotels' : type === 'restaurant' ? 'Restaurants' : 'Experiences'}
            <svg
              className="ml-2 h-5 w-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 5l7 7-7 7"></path>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

