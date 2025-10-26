'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface ImageGalleryProps {
  images: Array<string | {url: string; description?: string}>;
  hotelName: string;
}

export default function ImageGallery({ images, hotelName }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Normalize images to always have url and description
  const normalizedImages = images.map(img => 
    typeof img === 'string' ? { url: img, description: '' } : img
  );
  const displayImages = normalizedImages.slice(0, 5);
  const remainingCount = Math.max(0, images.length - 5);

  if (images.length === 0) {
    return (
      <div className="h-96 w-full rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Gallery - Beautiful Responsive Layout */}
      <div className="w-full">
        {/* Mobile Layout: Stack vertically */}
        <div className="block md:hidden">
          <div className="space-y-2">
            {/* Hero Image */}
            <div 
              className="relative h-80 w-full cursor-pointer overflow-hidden rounded-2xl group"
              onClick={() => setSelectedImage(0)}
            >
              <OptimizedImage
                src={displayImages[0].url}
                alt={`${hotelName} - Main`}
                fill
                className="object-cover transition-all duration-500 group-hover:scale-105"
                sizes="100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Label overlay */}
              {displayImages[0].description && (
                <div className="absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-2 backdrop-blur-sm">
                  <span className="text-sm font-medium text-white">{displayImages[0].description}</span>
                </div>
              )}
              
              {/* View all indicator */}
              {images.length > 1 && (
                <div className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-sm font-semibold text-gray-900">View All {images.length}</span>
                </div>
              )}
            </div>

            {/* Thumbnail Grid */}
            {displayImages.length > 1 && (
              <div className="grid grid-cols-2 gap-2">
                {displayImages.slice(1, 5).map((image, index) => (
                  <div
                    key={index}
                    className="relative h-32 cursor-pointer overflow-hidden rounded-xl group"
                    onClick={() => setSelectedImage(index + 1)}
                  >
                    <OptimizedImage
                      src={image.url}
                      alt={`${hotelName} - ${index + 2}`}
                      fill
                      className="object-cover transition-all duration-300 group-hover:scale-110"
                      sizes="50vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    
                    {/* Label overlay */}
                    {image.description && (
                      <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
                        <span className="text-xs font-medium text-white">{image.description}</span>
                      </div>
                    )}
                    
                    {/* Show remaining count on last image */}
                    {index === 3 && remainingCount > 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">+{remainingCount}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout: Hero + Side Grid */}
        <div className="hidden md:block">
          <div className="grid h-[60vh] grid-cols-4 gap-3 overflow-hidden rounded-2xl">
            {/* Hero Image - Takes 2 columns, 2 rows */}
            <div 
              className="col-span-2 row-span-2 cursor-pointer overflow-hidden group relative"
              onClick={() => setSelectedImage(0)}
            >
              <OptimizedImage
                src={displayImages[0].url}
                alt={`${hotelName} - Main`}
                fill
                className="object-cover transition-all duration-700 group-hover:scale-105"
                sizes="(max-width: 1200px) 50vw, 40vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Label overlay */}
              {displayImages[0].description && (
                <div className="absolute bottom-6 left-6 rounded-xl bg-black/70 px-4 py-2 backdrop-blur-sm">
                  <span className="text-base font-medium text-white">{displayImages[0].description}</span>
                </div>
              )}
              
              {/* View all indicator */}
              {images.length > 1 && (
                <div className="absolute top-6 right-6 rounded-full bg-white/95 px-4 py-2 backdrop-blur-sm shadow-lg">
                  <span className="text-sm font-semibold text-gray-900">View All {images.length}</span>
                </div>
              )}
            </div>

            {/* Thumbnail Grid - Right side */}
            {displayImages.slice(1, 5).map((image, index) => (
              <div
                key={index}
                className="relative cursor-pointer overflow-hidden group"
                onClick={() => setSelectedImage(index + 1)}
              >
                <OptimizedImage
                  src={image.url}
                  alt={`${hotelName} - ${index + 2}`}
                  fill
                  className="object-cover transition-all duration-500 group-hover:scale-110"
                  sizes="25vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                
                {/* Label overlay */}
                {image.description && (
                  <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-1.5 backdrop-blur-sm">
                    <span className="text-sm font-medium text-white">{image.description}</span>
                  </div>
                )}
                
                {/* Show remaining count on last image */}
                {index === 3 && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-white">+{remainingCount}</span>
                      <p className="text-sm text-white/90">more photos</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Beautiful Lightbox Modal */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => setSelectedImage(null)}
          >
            {/* Close Button */}
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute right-6 top-6 rounded-full bg-white/10 p-3 text-white transition-all duration-200 hover:bg-white/20 hover:scale-110"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>

            {/* Main Image */}
            <div className="relative max-h-[90vh] max-w-[90vw]">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <OptimizedImage
                  src={normalizedImages[selectedImage].url}
                  alt={`${hotelName} - ${selectedImage + 1}`}
                  width={1200}
                  height={800}
                  className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e?.stopPropagation()}
                  quality={95}
                />
              </motion.div>
              
              {/* Description in lightbox */}
              {normalizedImages[selectedImage].description && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-black/80 px-6 py-3 backdrop-blur-sm"
                >
                  <span className="text-white font-medium">{normalizedImages[selectedImage].description}</span>
                </motion.div>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  {selectedImage > 0 && (
                    <motion.button
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      transition={{ delay: 0.1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(selectedImage - 1);
                      }}
                      className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white transition-all duration-200 hover:bg-white/20 hover:scale-110"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </motion.button>
                  )}
                  {selectedImage < images.length - 1 && (
                    <motion.button
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      transition={{ delay: 0.1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(selectedImage + 1);
                      }}
                      className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white transition-all duration-200 hover:bg-white/20 hover:scale-110"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  )}
                </>
              )}

              {/* Image Counter */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute top-6 left-6 rounded-full bg-black/80 px-4 py-2 backdrop-blur-sm"
              >
                <span className="text-white font-medium">{selectedImage + 1} / {images.length}</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

