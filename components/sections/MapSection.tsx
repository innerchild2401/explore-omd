'use client';

import { useState } from 'react';
import type { Section, Business } from '@/types';

interface MapSectionProps {
  section: Section;
  businesses: Business[];
}

export default function MapSection({ section, businesses }: MapSectionProps) {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const { title } = section.content;

  // Filter businesses with valid coordinates
  const businessesWithLocation = businesses.filter(
    (b) => b.location?.coordinates?.lat && b.location?.coordinates?.lng
  );

  if (businessesWithLocation.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="mb-4 text-4xl font-bold">
            {title || 'Explore on Map'}
          </h2>
          <button
            onClick={() => setIsMapVisible(!isMapVisible)}
            className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {isMapVisible ? 'Hide Map' : 'Show Map'}
          </button>

          {isMapVisible && (
            <div className="mt-8 h-96 rounded-2xl bg-gray-200">
              {/* TODO: Integrate Leaflet/Mapbox map */}
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-600">Map integration coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

