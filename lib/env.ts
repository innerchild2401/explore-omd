/**
 * Environment Variable Validation
 * 
 * Validates all environment variables at startup using Zod.
 * Fails fast with clear error messages if required vars are missing.
 * 
 * Usage:
 *   import { env } from '@/lib/env';
 *   const url = env.NEXT_PUBLIC_SUPABASE_URL;
 */

import { z } from 'zod';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Node Environment (Required)
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MailerSend (Optional - required if sending emails)
  MAILER_SEND_API_KEY: z.string().optional(),
  MAILER_SEND_TRIAL_MODE: z.string().optional(),
  MAILER_SEND_TRIAL_EMAIL: z.string().email().optional(),
  MAILER_SEND_SENDER_EMAIL: z.string().email().optional(),
  MAILER_SEND_SENDER_NAME: z.string().optional(),
  MAILER_SEND_FROM_EMAIL: z.string().email().optional(),
  MARKETING_CONTACT_EMAIL: z.string().email().optional(),

  // Site Configuration (Optional)
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // Logging (Optional)
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),

  // Rate Limiting - Upstash (Optional)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Octorate Integration (Optional)
  OCTORATE_WEBHOOK_SECRET: z.string().optional(),

  // Cron Jobs (Optional)
  CRON_SECRET: z.string().optional(),

  // OpenAI (Optional - for translations)
  OPENAI_API_KEY: z.string().optional(),
});

/**
 * Validate and parse environment variables
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
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
 * Validated environment variables
 * This will throw an error at startup if validation fails
 */
export const env = validateEnv();

/**
 * Type-safe environment variable access
 */
export type Env = typeof env;

/**
 * Helper to check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if email sending is configured
 */
export const isEmailConfigured = !!env.MAILER_SEND_API_KEY;

/**
 * Helper to check if rate limiting is configured (Upstash)
 */
export const isRateLimitConfigured =
  !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN;

