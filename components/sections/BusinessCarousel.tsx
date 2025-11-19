'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Section, Business } from '@/types';
import { getImageUrl, formatPrice, getStarRating } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import OmdMemberBadge from '@/components/ui/OmdMemberBadge';
import type { TemplateName } from '@/lib/omdTemplates';

interface BusinessCarouselProps {
  section: Section;
  businesses: Business[];
  omdSlug: string;
  type: 'hotel' | 'restaurant' | 'experience';
  template: TemplateName;
}

export default function BusinessCarousel({
  section,
  businesses,
  omdSlug,
  type,
  template,
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

  const isStoryLayout = template === 'story';
  const isMapLayout = template === 'map';
  const sectionBackground =
    template === 'story'
      ? 'bg-black'
      : template === 'map'
      ? 'bg-slate-50'
      : 'bg-gray-50';

  const sectionTextClass = template === 'story' ? 'text-white' : 'text-gray-900';
  const subtitleTextClass = template === 'story' ? 'text-white/70' : 'text-gray-600';

  const cardBaseClass = isStoryLayout
    ? 'rounded-3xl overflow-hidden bg-white/10 border border-white/10 backdrop-blur shadow-2xl'
    : 'rounded-2xl bg-white shadow-lg overflow-hidden';

  const cardHoverClass = isStoryLayout ? 'hover:bg-white/20' : 'hover:shadow-xl';

  const renderClassicCard = (business: Business, index: number) => {
    const mainImage =
      typeof business.images?.[0] === 'string'
        ? business.images[0]
        : (business.images?.[0] as any)?.url || '/placeholder.jpg';

    return (
      <div
        key={business.id}
        className="flex-shrink-0"
        style={{ pointerEvents: 'auto' }}
      >
        <Link
          href={`/${omdSlug}/${type}s/${business.slug}`}
          className="block touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          prefetch={true}
        >
          <div className={`group ${cardBaseClass} ${cardHoverClass} w-[280px] flex-shrink-0 transition-shadow`}>
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              <OptimizedImage
                src={getImageUrl(mainImage)}
                alt={business.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={index < 3}
              />
              <div className="absolute right-2 top-2 flex flex-col items-end gap-2">
                {business.is_omd_member && <OmdMemberBadge size="sm" />}
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
                <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{business.name}</h3>
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
              <p className="mb-3 text-sm text-gray-600 line-clamp-2">{business.description}</p>

              {business.location?.address && (
                <div className="mb-3 flex items-center text-sm text-gray-500">
                  <svg className="mr-1 h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span className="line-clamp-1">{business.location.address}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600">View Details</span>
                <svg className="h-6 w-6 text-blue-600 transition-transform group-hover:translate-x-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  };

  const renderStoryCard = (business: Business, index: number) => {
    const mainImage =
      typeof business.images?.[0] === 'string'
        ? business.images[0]
        : (business.images?.[0] as any)?.url || '/placeholder.jpg';

    return (
      <div
        key={business.id}
      >
        <Link href={`/${omdSlug}/${type}s/${business.slug}`} className="block" prefetch={true}>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 transition">
            <div className="relative h-60 w-full overflow-hidden rounded-2xl sm:h-72">
              <OptimizedImage src={getImageUrl(mainImage)} alt={business.name} fill className="object-cover" sizes="100vw" priority={index < 2} />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-2xl font-semibold">{business.name}</h3>
                {business.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-white/80">{business.description}</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-white/70">
              <span>{business.location?.address || omdSlug}</span>
              <span className="inline-flex items-center gap-2 font-semibold text-white">
                Discover
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      </div>
    );
  };

  const renderMapCard = (business: Business, index: number) => {
    const mainImage =
      typeof business.images?.[0] === 'string'
        ? business.images[0]
        : (business.images?.[0] as any)?.url || '/placeholder.jpg';

    return (
      <div
        key={business.id}
        className="flex-shrink-0 w-[280px]"
      >
        <Link href={`/${omdSlug}/${type}s/${business.slug}`} className="block" prefetch>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
            <div className="relative h-40 overflow-hidden rounded-t-2xl">
              <OptimizedImage
                src={getImageUrl(mainImage)}
                alt={business.name}
                fill
                className="object-cover"
                sizes="100vw"
                priority={index < 3}
              />
              <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-medium text-blue-700 shadow-sm">
                View on Map
              </div>
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">{business.name}</h3>
                {business.rating > 0 && (
                  <span className="flex items-center gap-1 text-sm text-amber-500">
                    ★ {business.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 line-clamp-2">{business.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {business.location?.address ? 'Directions' : 'Discover'}
                </span>
                <span className="text-sm font-semibold text-slate-900">Details</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <section className={`${sectionBackground} py-8 md:py-10`}>
      <div className="mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={`mb-3 flex justify-center ${template === 'story' ? 'text-white' : 'text-blue-600'}`}>
              {getTypeIcon()}
            </div>
            <h2 className={`mb-2 text-3xl sm:text-4xl font-bold ${sectionTextClass}`}>
              {title || `Where to ${type === 'hotel' ? 'Stay' : type === 'restaurant' ? 'Eat' : 'Explore'}`}
            </h2>
            {subtitle && <p className={`text-lg ${subtitleTextClass}`}>{subtitle}</p>}
          </motion.div>
        </div>

        {isStoryLayout ? (
          <div className="space-y-6">
            {businesses.map((business, index) => renderStoryCard(business, index))}
          </div>
        ) : isMapLayout ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {businesses.map((business, index) => renderMapCard(business, index))}
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4">
            {businesses.map((business, index) => renderClassicCard(business, index))}
          </div>
        )}

        {/* View All Link */}
        <div className="mt-8 text-center">
          <Link
            href={`/${omdSlug}/${type}s`}
            className={`inline-flex items-center text-lg font-semibold ${
              template === 'story' ? 'text-white' : 'text-blue-600'
            } hover:underline touch-manipulation`}
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

