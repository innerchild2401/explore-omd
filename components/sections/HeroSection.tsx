'use client';

import { motion } from 'framer-motion';
import type { Section, OMD } from '@/types';
import { getImageUrl } from '@/lib/utils';

interface HeroSectionProps {
  section: Section;
  omd: OMD;
}

export default function HeroSection({ section, omd }: HeroSectionProps) {
  const { title, subtitle, cta, backgroundImage } = section.content;

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Image/Video */}
      <div className="absolute inset-0 z-0">
        {backgroundImage ? (
          <img
            src={getImageUrl(backgroundImage)}
            alt={title || omd.name}
            className="h-full w-full object-cover"
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
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          {/* Logo */}
          {omd.logo && (
            <motion.img
              src={getImageUrl(omd.logo)}
              alt={omd.name}
              className="mx-auto mb-8 h-24 w-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            />
          )}

          {/* Title */}
          <motion.h1
            className="mb-4 text-5xl font-bold text-white md:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {title || `Explore ${omd.name}`}
          </motion.h1>

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              className="mb-8 text-xl text-white/90 md:text-2xl"
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
              className="rounded-full px-8 py-4 text-lg font-semibold text-white transition-all hover:scale-105"
              style={{ backgroundColor: omd.colors.primary }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {cta}
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

