'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Section, Business } from '@/types';
import { getImageUrl, formatPrice, getStarRating } from '@/lib/utils';

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
        return '🏨';
      case 'restaurant':
        return '🍽️';
      case 'experience':
        return '🎟️';
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
            <span className="mb-2 text-4xl">{getTypeIcon()}</span>
            <h2 className="mb-2 text-4xl font-bold">
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
              >
                <Link href={`/${omdSlug}/business/${business.slug}`}>
                  <div className="group w-80 overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-xl">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={getImageUrl(business.images[0])}
                        alt={business.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      {business.rating > 0 && (
                        <div className="absolute right-2 top-2 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-md">
                          {business.rating} ⭐
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="mb-2 text-xl font-bold line-clamp-1">
                        {business.name}
                      </h3>
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
            className="inline-flex items-center text-lg font-semibold text-blue-600 hover:underline"
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

