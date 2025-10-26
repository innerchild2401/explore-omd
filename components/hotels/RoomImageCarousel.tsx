'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RoomImageCarouselProps {
  images: Array<string | {url: string; description?: string}>;
  roomName: string;
}

export default function RoomImageCarousel({ images, roomName }: RoomImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Normalize images
  const normalizedImages = images.map(img => 
    typeof img === 'string' ? { url: img, description: '' } : img
  );

  if (normalizedImages.length === 0) {
    return (
      <div className="relative h-64 w-full rounded-lg bg-gray-200 flex items-center justify-center">
        <span className="text-gray-400">No images</span>
      </div>
    );
  }

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? normalizedImages.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === normalizedImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-900 group">
        {/* Main Image */}
        <img
          src={normalizedImages[currentIndex].url}
          alt={`${roomName} - ${currentIndex + 1}`}
          className="h-full w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
          onClick={() => setShowLightbox(true)}
        />

        {/* Image Description Overlay */}
        {normalizedImages[currentIndex].description && (
          <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
            <span className="text-xs font-medium text-white">{normalizedImages[currentIndex].description}</span>
          </div>
        )}

        {/* Navigation Arrows - Only show if more than 1 image */}
        {normalizedImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 opacity-0 shadow-lg transition-opacity hover:bg-white group-hover:opacity-100"
            >
              <svg className="h-5 w-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 opacity-0 shadow-lg transition-opacity hover:bg-white group-hover:opacity-100"
            >
              <svg className="h-5 w-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {normalizedImages.length > 1 && (
          <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
            <span className="text-xs font-medium text-white">
              {currentIndex + 1} / {normalizedImages.length}
            </span>
          </div>
        )}

        {/* Thumbnail Dots */}
        {normalizedImages.length > 1 && (
          <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 gap-1.5">
            {normalizedImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-4 bg-white'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => setShowLightbox(false)}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative max-h-[90vh] max-w-[90vw]">
              <img
                src={normalizedImages[currentIndex].url}
                alt={`${roomName} - ${currentIndex + 1}`}
                className="max-h-[90vh] max-w-[90vw] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* Description in lightbox */}
              {normalizedImages[currentIndex].description && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 backdrop-blur-sm">
                  <span className="text-white font-medium">{normalizedImages[currentIndex].description}</span>
                </div>
              )}

              {/* Navigation in lightbox */}
              {normalizedImages.length > 1 && (
                <>
                  {currentIndex > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(currentIndex - 1);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {currentIndex < normalizedImages.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(currentIndex + 1);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </>
              )}

              {/* Counter in lightbox */}
              <div className="absolute bottom-4 right-4 rounded-full bg-black/50 px-4 py-2 text-white">
                {currentIndex + 1} / {normalizedImages.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

