/**
 * Client-Safe Environment Variable Access
 * 
 * Provides type-safe access to NEXT_PUBLIC_* variables that are safe to expose to the client.
 * Validation is lazy - only validates when values are accessed, not at module load time.
 * 
 * Usage:
 *   import { env } from '@/lib/env.client';
 *   const url = env.NEXT_PUBLIC_SUPABASE_URL;
 */

import { z } from 'zod';

/**
 * Client-safe environment variable schema
 * Only includes NEXT_PUBLIC_* variables
 */
const clientEnvSchema = z.object({
  // Supabase (Required for client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Site Configuration (Optional)
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

/**
 * Validate environment variable value
 * Note: Must access process.env.NEXT_PUBLIC_* directly (not via variable)
 * for Next.js static replacement to work at build time
 */
function validateEnvValue(value: string | undefined, varName: string): string {
  // Only validate in browser runtime, not during SSR or build
  if (typeof window !== 'undefined') {
    if (!value || value.trim() === '') {
      // Detect if we're in production (Vercel)
      const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
      const envGuidance = isProduction
        ? `For production (Vercel): Add ${varName} in Vercel Dashboard → Project Settings → Environment Variables → Production`
        : `For local development: Add ${varName} to your .env.local file`;
      
      throw new Error(
        `❌ Environment variable validation failed!\n\n` +
        `Missing required variable: ${varName}\n\n` +
        `${envGuidance}\n\n` +
        `See README.md for the list of required variables.`
      );
    }

    // Validate format if it's a URL
    if (varName === 'NEXT_PUBLIC_SUPABASE_URL' || varName === 'NEXT_PUBLIC_SITE_URL') {
      try {
        new URL(value);
      } catch {
        throw new Error(`${varName} must be a valid URL`);
      }
    }
  }

  // Return the value (may be empty during build, but Next.js will replace it)
  return value || '';
}

/**
 * Lazy-validated client-safe environment variables
 * IMPORTANT: Access process.env.NEXT_PUBLIC_* directly (not via variable)
 * so Next.js can statically replace them at build time
 */
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    // Direct access - Next.js will replace this at build time
    return validateEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    // Direct access - Next.js will replace this at build time
    return validateEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get NEXT_PUBLIC_SITE_URL() {
    // Direct access - Next.js will replace this at build time
    return process.env.NEXT_PUBLIC_SITE_URL || undefined;
  },
} as const;

/**
 * Type-safe client environment variable access
 */
export type ClientEnv = typeof env;

