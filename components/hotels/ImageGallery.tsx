'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageGalleryProps {
  images: string[];
  hotelName: string;
}

export default function ImageGallery({ images, hotelName }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const displayImages = images.slice(0, 5);
  const remainingCount = Math.max(0, images.length - 5);

  if (images.length === 0) {
    return (
      <div className="h-96 w-full rounded-2xl bg-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 overflow-hidden rounded-2xl">
        {/* Main large image */}
        <div 
          className="col-span-4 md:col-span-2 md:row-span-2 cursor-pointer overflow-hidden group relative"
          onClick={() => setSelectedImage(0)}
        >
          <img
            src={displayImages[0]}
            alt={`${hotelName} - Main`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ maxHeight: '500px' }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* Smaller images */}
        {displayImages.slice(1, 5).map((image, index) => (
          <div
            key={index}
            className="relative col-span-2 md:col-span-1 h-60 cursor-pointer overflow-hidden group"
            onClick={() => setSelectedImage(index + 1)}
          >
            <img
              src={image}
              alt={`${hotelName} - ${index + 2}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            
            {/* Show remaining count on last image */}
            {index === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">+{remainingCount} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative max-h-[90vh] max-w-[90vw]">
              <img
                src={images[selectedImage]}
                alt={`${hotelName} - ${selectedImage + 1}`}
                className="max-h-[90vh] max-w-[90vw] object-contain"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Navigation */}
              {images.length > 1 && (
                <>
                  {selectedImage > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(selectedImage - 1);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {selectedImage < images.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(selectedImage + 1);
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

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-white">
                {selectedImage + 1} / {images.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

