/**
 * Server-Side Environment Variable Access
 * 
 * Use this for server-side only environment variables
 * (variables that should not be exposed to the client)
 */

import { env } from './env';

/**
 * Server-only environment variables
 * These are safe to use in API routes and server components
 */
export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  MAILER_SEND_API_KEY: env.MAILER_SEND_API_KEY,
  MAILER_SEND_TRIAL_MODE: env.MAILER_SEND_TRIAL_MODE,
  MAILER_SEND_TRIAL_EMAIL: env.MAILER_SEND_TRIAL_EMAIL,
  MAILER_SEND_SENDER_EMAIL: env.MAILER_SEND_SENDER_EMAIL,
  MAILER_SEND_SENDER_NAME: env.MAILER_SEND_SENDER_NAME,
  MAILER_SEND_FROM_EMAIL: env.MAILER_SEND_FROM_EMAIL,
  MARKETING_CONTACT_EMAIL: env.MARKETING_CONTACT_EMAIL,
  UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
  OCTORATE_WEBHOOK_SECRET: env.OCTORATE_WEBHOOK_SECRET,
  CRON_SECRET: env.CRON_SECRET,
  OPENAI_API_KEY: env.OPENAI_API_KEY,
  NODE_ENV: env.NODE_ENV,
  LOG_LEVEL: env.LOG_LEVEL,
} as const;

