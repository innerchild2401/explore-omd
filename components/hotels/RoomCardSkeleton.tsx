'use client';

export default function RoomCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm animate-pulse">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Image Skeleton */}
        <div className="md:col-span-1">
          <div className="h-64 w-full rounded-lg bg-gray-200" />
        </div>

        {/* Content Skeleton */}
        <div className="p-6 md:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title */}
              <div className="mb-2 h-8 w-3/4 rounded bg-gray-200" />
              
              {/* Room Type */}
              <div className="mb-4 h-4 w-1/2 rounded bg-gray-200" />

              {/* Features */}
              <div className="mb-4 flex flex-wrap gap-4">
                <div className="h-5 w-20 rounded bg-gray-200" />
                <div className="h-5 w-16 rounded bg-gray-200" />
                <div className="h-5 w-24 rounded bg-gray-200" />
              </div>

              {/* Amenities */}
              <div className="mb-4 flex flex-wrap gap-2">
                <div className="h-6 w-16 rounded-full bg-gray-200" />
                <div className="h-6 w-20 rounded-full bg-gray-200" />
                <div className="h-6 w-18 rounded-full bg-gray-200" />
              </div>
            </div>

            {/* Price & Button Skeleton */}
            <div className="ml-4 text-right">
              <div className="mb-2">
                <div className="mb-1 h-8 w-20 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
              </div>
              <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
              <div className="h-10 w-24 rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
