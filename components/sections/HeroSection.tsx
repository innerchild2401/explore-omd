'use client';

import { motion } from 'framer-motion';
import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Section, OMD } from '@/types';
import type { TemplateName } from '@/lib/omdTemplates';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface HeroSectionProps {
  section: Section;
  omd: OMD;
  template: TemplateName;
}

export default function HeroSection({ section, omd, template }: HeroSectionProps) {
  const { title, subtitle, cta, backgroundImage, backgroundVideo } = section.content;
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();

  useEffect(() => {
    if (!cta) {
      return;
    }

    try {
      router.prefetch(`/${omd.slug}/explore`);
    } catch {
      // Prefetch can throw during server render; ignore
    }
  }, [cta, omd.slug, router]);

  const handleExploreClick = () => {
    if (!cta || isNavigating) {
      return;
    }

    startTransition(() => {
      router.push(`/${omd.slug}/explore`);
    });
  };

  const getHeroClasses = () => {
    switch (template) {
      case 'story':
        return 'relative min-h-screen w-full overflow-hidden bg-black text-left';
      case 'map':
        return 'relative min-h-[80vh] w-full overflow-hidden bg-slate-900';
      default:
        return 'relative h-screen w-full overflow-hidden';
    }
  };

  const getContentAlignmentClasses = () => {
    switch (template) {
      case 'story':
        return 'relative z-10 flex h-full flex-col justify-center px-4 text-left sm:px-8 md:px-16';
      case 'map':
        return 'relative z-10 flex h-full flex-col items-center justify-center px-4 text-center';
      default:
        return 'relative z-10 flex h-full flex-col items-center justify-center px-4 text-center';
    }
  };

  return (
    <section className={getHeroClasses()}>
      {/* Background Image/Video */}
      <div className="absolute inset-0 z-0">
        {backgroundVideo ? (
          <video
            key={backgroundVideo}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            poster={backgroundImage ? getImageUrl(backgroundImage) : undefined}
          >
            <source
              src={
                backgroundVideo.startsWith('http')
                  ? backgroundVideo
                  : getImageUrl(backgroundVideo)
              }
              type={
                backgroundVideo.toLowerCase().endsWith('.webm')
                  ? 'video/webm'
                  : 'video/mp4'
              }
            />
          </video>
        ) : backgroundImage ? (
          <OptimizedImage
            src={getImageUrl(backgroundImage)}
            alt={title || omd.name}
            fill
            className={`object-cover ${template === 'story' ? 'opacity-95' : ''}`}
            priority
            sizes="100vw"
          />
        ) : (
          <div 
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${omd.colors.primary} 0%, ${omd.colors.secondary} 100%)`,
            }}
          />
        )}
        {/* Overlay */}
        <div
          className={`absolute inset-0 ${
            template === 'story'
              ? 'bg-gradient-to-br from-black/80 via-black/40 to-transparent'
              : template === 'map'
              ? 'bg-black/50'
              : 'bg-black/40'
          }`}
        />
      </div>

      {/* Content */}
      <div className={getContentAlignmentClasses()}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={`w-full ${template === 'story' ? 'max-w-3xl text-white' : 'max-w-4xl'}`}
        >
          {/* Logo */}
          {omd.logo && template !== 'story' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="mx-auto mb-8 h-24 w-auto"
            >
              <OptimizedImage
                src={getImageUrl(omd.logo)}
                alt={omd.name}
                width={96}
                height={96}
                className="h-24 w-auto"
                priority
              />
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            className={`mb-4 font-bold text-white ${
              template === 'story' ? 'text-4xl sm:text-5xl md:text-6xl' : 'text-5xl md:text-7xl'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {title || `Explore ${omd.name}`}
          </motion.h1>

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              className={`mb-8 text-white/90 ${
                template === 'story' ? 'text-lg sm:text-xl md:text-2xl' : 'text-xl md:text-2xl'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {subtitle}
            </motion.p>
          )}

          {/* CTA Button */}
          {cta && (
            <motion.button
              type="button"
              onClick={handleExploreClick}
              whileTap={{ scale: 0.96 }}
              disabled={isNavigating}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-90 touch-manipulation ${
                template === 'story' ? 'shadow-lg shadow-black/30' : ''
              }`}
              style={{
                backgroundColor: omd.colors.primary,
                touchAction: 'manipulation',
              }}
              aria-busy={isNavigating}
            >
              {isNavigating && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
                  aria-hidden="true"
                />
              )}
              <span>{cta}</span>
            </motion.button>
          )}
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <motion.div
            className="flex flex-col items-center text-white"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="mb-2 text-sm">Scroll to explore</span>
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

