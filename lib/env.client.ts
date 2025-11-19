/**
 * Client-Safe Environment Variable Validation
 * 
 * Only validates NEXT_PUBLIC_* variables that are safe to expose to the client.
 * This should be used in client-side code (components, client components, etc.)
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
 * Validate and parse client-safe environment variables
 */
function validateClientEnv() {
  try {
    return clientEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((e) => e.code === 'invalid_type' && e.received === 'undefined')
        .map((e) => e.path.join('.'));

      const invalidVars = error.errors
        .filter((e) => e.code !== 'invalid_type' || e.received !== 'undefined')
        .map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));

      let errorMessage = '❌ Environment variable validation failed!\n\n';

      if (missingVars.length > 0) {
        errorMessage += 'Missing required variables:\n';
        missingVars.forEach((varName) => {
          errorMessage += `  - ${varName}\n`;
        });
        errorMessage += '\n';
      }

      if (invalidVars.length > 0) {
        errorMessage += 'Invalid variables:\n';
        invalidVars.forEach(({ path, message }) => {
          errorMessage += `  - ${path}: ${message}\n`;
        });
        errorMessage += '\n';
      }

      errorMessage +=
        'Please check your .env.local file and ensure all required variables are set.\n';
      errorMessage +=
        'See README.md or .env.example for the list of required variables.';

      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Validated client-safe environment variables
 * This will throw an error at startup if validation fails
 */
export const env = validateClientEnv();

/**
 * Type-safe client environment variable access
 */
export type ClientEnv = typeof env;

