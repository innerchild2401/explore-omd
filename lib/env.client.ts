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
 * Validate a single environment variable when accessed
 * Uses process.env directly - Next.js replaces NEXT_PUBLIC_* at build time
 */
function validateEnvVar(key: keyof z.infer<typeof clientEnvSchema>): string {
  // Access process.env directly - Next.js will replace NEXT_PUBLIC_* vars at build time
  const value = process.env[key];
  
  // Only validate in browser runtime, not during SSR or build
  if (typeof window !== 'undefined') {
    if (!value || value.trim() === '') {
      // Detect if we're in production (Vercel)
      const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
      const envGuidance = isProduction
        ? `For production (Vercel): Add ${key} in Vercel Dashboard → Project Settings → Environment Variables → Production`
        : `For local development: Add ${key} to your .env.local file`;
      
      throw new Error(
        `❌ Environment variable validation failed!\n\n` +
        `Missing required variable: ${key}\n\n` +
        `${envGuidance}\n\n` +
        `See README.md for the list of required variables.`
      );
    }

    // Validate format if it's a URL
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'NEXT_PUBLIC_SITE_URL') {
      try {
        new URL(value);
      } catch {
        throw new Error(`${key} must be a valid URL`);
      }
    }
  }

  // Return the value (may be empty during build, but Next.js will replace it)
  return value || '';
}

/**
 * Lazy-validated client-safe environment variables
 * Values are validated only when accessed, not at module load time
 */
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return validateEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return validateEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get NEXT_PUBLIC_SITE_URL() {
    return process.env.NEXT_PUBLIC_SITE_URL || undefined;
  },
} as const;

/**
 * Type-safe client environment variable access
 */
export type ClientEnv = typeof env;

